---
title: "Distributed Locks: What They Actually Guarantee"
description: "A distributed lock cannot promise mutual exclusion, because it cannot control the process holding it. What it can do is still useful — provided you know which of the two problems you have."
date: 2026-08-28
category: "Distributed Systems"
tags:
  - Coordination
  - Consistency
  - Reliability
  - Redis
featured: true
draft: false
---

A mutex in a single process works because there is one scheduler, one memory space, and one authority deciding who holds what. Take any of those away and the guarantee changes shape in a way that is easy to miss, because the API stays the same.

`lock()` and `unlock()` look identical whether the lock lives in a `synchronized` block or in Redis. The semantics do not survive the trip.

## The lease problem

Every distributed lock has a timeout. It has to. If a lock holder crashes, something must eventually release the lock, and the only mechanism available to a lock service that cannot observe the holder's liveness is a lease that expires.

That expiry is the whole problem:

1. Client A acquires the lock with a 30 second lease.
2. Client A begins its critical section.
3. Client A stops running for 45 seconds.
4. The lease expires. The lock service, correctly, considers the lock free.
5. Client B acquires the lock and begins its critical section.
6. Client A resumes — with no idea that any time has passed — and continues its critical section.

Two clients are now inside the critical section, and neither has done anything wrong.

The usual objection is that step 3 is unrealistic. It is not. A stop-the-world garbage collection pause on a large heap can reach that range. So can memory pressure that pushes a process into swap, a hypervisor live-migrating a VM, a container hitting a CPU quota and being throttled, or a machine suspending. None of these are exotic. They are Tuesday.

And crucially, **the process cannot detect that it happened.** From inside client A, no time passed at all. Checking the clock after acquiring the lock does not help, because the pause can land between the check and the write.

This is the part that makes distributed locks structurally different from mutexes rather than just less reliable. The lock service is making a statement about *its own view of a lease*. It is not, and cannot be, making a statement about what the holder is doing.

## Consensus does not fix it

A common response is that this is a Redis problem, and that a properly linearizable coordination service solves it. The Redlock debate between Martin Kleppmann and Salvatore Sanfilippo covered this ground thoroughly in 2016, and it is worth reading both sides.

But the conclusion generalises past Redis. Using ZooKeeper or etcd genuinely improves things: you get linearizable operations, a real consensus protocol, and session-based ephemeral nodes that release on disconnect rather than purely on a wall-clock timer. That eliminates a category of failure related to clock skew and split-brain in the lock service itself.

It does not eliminate the pause problem, because the pause is not in the lock service. It is in the client. No amount of agreement among lock servers tells them what a paused client is about to do when it wakes up. The lock service is correct and the client is wrong, and the resource being protected has no way to tell them apart.

## Fencing tokens: moving the check to the resource

The fix — and there is a real fix — is to stop asking the lock to enforce exclusion and start asking the *resource* to enforce it.

When a client acquires the lock, the lock service also returns a monotonically increasing token. Every write to the protected resource carries that token. The resource rejects any write whose token is lower than the highest it has already accepted.

Replaying the earlier scenario:

1. Client A acquires the lock and receives token `33`.
2. Client A pauses.
3. The lease expires; client B acquires the lock and receives token `34`.
4. Client B writes with token `34`. The resource accepts it and remembers `34`.
5. Client A wakes and writes with token `33`. The resource rejects it — `33 < 34`.

Mutual exclusion was still violated in the sense that both clients believed they held the lock. The *damage* was prevented, because the resource had enough information to identify the stale writer.

Note where the enforcement lives. Not in the lock, not in the client, but at the point of mutation. This is the same structural move as optimistic concurrency control — a conditional write, `UPDATE ... WHERE version = ?`, a compare-and-swap, an `If-Match` header. The lock became an optimization that reduces contention; the token became the mechanism that provides correctness.

The catch is that the resource has to participate. If you are writing to a store that supports conditional writes or has any notion of a version column, this is straightforward. If you are calling a third-party API that accepts whatever you send it, you cannot fence, and you should know that you cannot.

## Two different problems wearing the same word

Almost all of the confusion here comes from using one word for two requirements with completely different failure economics.

**Efficiency locks.** You want to avoid doing the same work twice. Two workers regenerating the same cache entry, two schedulers sending the same digest email, two nodes both rebuilding the same index. If the lock occasionally fails, you waste some compute or send a duplicate email. That is an annoyance, not an incident.

For this, a Redis `SET key value NX PX 30000` is entirely adequate. It is fast, it is simple, it is one round trip, and its failure mode costs you nothing that matters. Reaching for a consensus system here is over-engineering.

**Correctness locks.** A violation corrupts data or breaks an invariant. Double-charging a card, two writers clobbering each other's updates, an inventory count going negative.

For this, a lock alone is *never* sufficient, no matter which lock service you choose. You need fencing tokens, or conditional writes, or an idempotency key that makes double execution harmless. The lock reduces contention; something at the resource provides the guarantee.

The single most useful question to ask about any distributed lock in a codebase is: **which of these two is it?** In my experience the answer is frequently "we did not decide" — the lock was added because concurrency was causing a problem, it made the problem go away in testing, and nobody wrote down whether the remaining failure window was acceptable.

## What to do instead, when you can

Locks are a mechanism for making concurrent things behave as though they were sequential. That is expensive, and it is worth checking whether you need it at all before paying for it.

- **Conditional writes.** If the datastore supports compare-and-set, the lock frequently disappears entirely. The write either applies to the state you expected or it fails and you retry. This is a lock scoped to exactly one operation on exactly one item.
- **Idempotency keys.** If executing twice is harmless, exclusion stops being a correctness requirement. This is generally cheaper to build than it looks and it composes well with retries, which you already have.
- **Partitioned ownership.** Route all work for an entity to a single owner — a Kafka partition, a consistent-hash shard, a single-writer actor. Concurrency is eliminated by construction rather than suppressed at runtime. The trade-off moves to availability during ownership transfer, which is at least an explicit and observable trade-off.
- **Single-writer designs.** If one component owns a piece of state, no lock is needed to protect it. This constrains the architecture, which is precisely what makes it work.

## The honest summary

A distributed lock guarantees that the lock service believes one client holds a lease. It does not guarantee that only one client is executing the critical section, and it cannot, because it has no visibility into whether its clients are running.

That is not a reason to avoid distributed locks. It is a reason to be specific about what you are asking one to do. If the answer is "reduce duplicate work," a simple lock is the right tool and the failure mode is acceptable. If the answer is "prevent data corruption," the lock is one part of a design that also needs a fencing token or a conditional write — and if you cannot fence the resource, then you do not have the guarantee you think you have, and it is much better to know that before the incident than during it.
