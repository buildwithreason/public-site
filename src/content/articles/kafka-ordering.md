---
title: "Why Kafka Ordering Is Harder Than It Looks"
description: "Kafka gives you ordering per partition. Almost every ordering bug in production comes from a gap between that guarantee and the one people believed they had."
date: 2026-08-20
category: "Distributed Systems"
tags:
  - Kafka
  - Messaging
  - Idempotency
  - Consistency
featured: true
draft: false
---

Kafka's ordering guarantee is easy to state and easy to misread.

**Messages are ordered within a partition.** That is the whole guarantee. There is no ordering across partitions, and there is no ordering at the level of a topic. Every ordering bug I have seen in a Kafka-based system comes from the distance between that sentence and the sentence people think they read, which is usually "Kafka preserves the order I sent things in."

The gap is worth walking through carefully, because it opens up in at least five distinct places, and the places have almost nothing to do with each other.

## 1. The key determines the partition, and the partition count determines the key

The standard advice is correct: if you need per-entity ordering, use the entity id as the message key. The default partitioner hashes the key and takes the result modulo the partition count, so every message for `order-4471` lands on the same partition and arrives in order.

The part that gets left out is the modulo.

```text
partition = hash(key) % partition_count
```

Change `partition_count` and the mapping changes for essentially every key. Kafka lets you add partitions to a topic online, and it is a tempting operation when a topic is running hot. The moment you do it, messages for `order-4471` begin landing on a different partition than the ones already in flight — and there is nothing coordinating the two. A consumer can read the new partition's message before another consumer reads the old partition's backlog.

The system does not warn you. Throughput improves. Ordering silently stops holding for every key in flight during the transition.

This is why "you cannot decrease partitions, and you should not casually increase them" is really an ordering statement rather than an operational one. If per-key ordering matters, partition count is part of your data model, not a tuning knob. Pick it with headroom.

## 2. The producer can reorder before the data ever leaves the process

A producer batches, and it can have several batches in flight to the same broker at once. Consider what happens when the first batch fails and is retried:

- Batch A (offsets for messages 1–10) is sent, and the broker times out.
- Batch B (messages 11–20) is sent, and succeeds.
- Batch A is retried, and succeeds.

The log now contains 11–20 followed by 1–10. The producer did nothing wrong. `retries` and `max.in.flight.requests.per.connection > 1` are both defaults you want for throughput, and together they permit reordering.

The fix is the idempotent producer, which is enabled by default in modern Kafka (`enable.idempotence=true`, the default since 3.0). Each producer gets a producer id and each message a sequence number per partition; the broker rejects out-of-sequence batches and the client retries them in order. With idempotence on, up to five in-flight requests per connection is safe.

Two things are worth knowing about this. First, if you explicitly set `max.in.flight.requests.per.connection` above 5, or set `retries=0`, or disable idempotence to work around something, you have quietly re-enabled reordering. Second, idempotence is scoped to a producer session and a partition. It deduplicates retries; it does not give you ordering across two producer instances writing the same key, which is a problem no broker setting can solve.

## 3. One consumer per partition is not one thread per partition

Within a consumer group, a partition is assigned to exactly one consumer. People reasonably conclude that consumption is therefore ordered.

It is — until the code does this:

```java
// Reads in order. Processes in whatever order the pool feels like.
for (ConsumerRecord<String, String> record : consumer.poll(timeout)) {
    executor.submit(() -> handle(record));
}
```

`poll()` returned the records in offset order. The thread pool then destroyed that property immediately. This is an easy pattern to arrive at, because it is the obvious way to stop a slow handler from blocking the poll loop, and because it looks like it preserves order — the reads *are* ordered.

If you need both parallelism and per-key ordering inside a consumer, the ordering has to be reconstructed explicitly: hash the key onto one of N single-threaded executors so that all messages for a given key are handled by the same thread, and track offsets so that you only commit up to the lowest unprocessed offset. That is a real piece of machinery with real bookkeeping, and it is worth being deliberate about building it rather than discovering later that you needed it.

## 4. Retries and dead-letter topics are ordering violations by construction

The standard resilience pattern is: if handling a message fails, publish it to a retry topic with a delay, and move on.

Look at what that does to ordering. Message 1 for `order-4471` fails and goes to the retry topic. Message 2 for the same order succeeds immediately. Message 1 is retried thirty seconds later and succeeds. The two messages have now been applied in the opposite order to the one they were produced in.

There is no configuration that fixes this, because it is not a bug in the retry mechanism — it is what "retry later, keep making progress" means. You are choosing availability over ordering, which is often the right choice. It just has to be a choice rather than an accident.

The alternatives are all uncomfortable in their own way: block the partition until the message succeeds (ordering preserved, head-of-line blocking introduced), route the retry to a per-key queue that also holds subsequent messages for that key (correct, complicated), or make the handler order-insensitive so the question stops mattering. The third option is usually the best one, which brings us to the real point.

## 5. Consumer rebalances turn "at least once" into "out of order"

When a consumer joins or leaves the group, partitions are reassigned. If a consumer processed a batch of messages but had not yet committed their offsets when it lost the partition, the new owner starts from the last committed offset and reprocesses them.

That is the familiar at-least-once duplicate. What is less often noticed is that it is *also* an ordering event at the level of effects: the state machine sees 1, 2, 3, 2, 3, 4. If your handler is a blind overwrite that is harmless. If it is `balance += amount` it is a correctness bug. If it is "set status to whatever this message says" then a redelivered older message can move an entity backwards.

Cooperative rebalancing (`CooperativeStickyAssignor`) reduces how often this happens by avoiding a full stop-the-world reassignment, and shorter processing batches reduce the window. Neither eliminates it.

## The question underneath all five

Every one of these has a specific mitigation, but stacking five mitigations produces a system where ordering is preserved by a chain of five assumptions, any of which can be broken by a routine operational change — adding partitions, tuning a producer, adding a thread pool, adding a retry topic, deploying a new consumer.

Which is why the more useful question is usually not *how do I guarantee ordering* but *why does my handler care about ordering at all?*

Ordering is a means to an end. The end is almost always that the final state should be correct regardless of what the network did. There are cheaper ways to get there:

- **Version the entity.** Carry a monotonic version or timestamp in the message and reject anything older than what you have already applied. A late duplicate becomes a no-op instead of a corruption. This is a conditional write, and most datastores support it directly.
- **Make the operation idempotent.** `set status = shipped` can be applied twice safely; `increment shipped_count` cannot. The difference is a modelling decision available to you at design time.
- **Make operations commutative.** If the operations genuinely commute, order stops being a correctness property and becomes a display preference.

Each of these converts an ordering requirement into a local property of the handler, which is a much better place to keep it. A property enforced in one function survives partition changes, thread pools, retry topics and rebalances. A property that depends on five layers cooperating does not.

Kafka's per-partition ordering is a genuinely strong and genuinely useful guarantee. It is just a much narrower one than the phrase "ordered messaging" suggests, and the narrowness is the interesting part.
