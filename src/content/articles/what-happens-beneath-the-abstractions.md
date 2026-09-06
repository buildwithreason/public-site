---
title: "What Happens Beneath the Abstractions"
description: "Every abstraction is a bet about what you will never need to know. Understanding the bet is most of what separates engineers who can debug a system from engineers who can only operate one."
date: 2026-08-12
category: "Engineering Thinking"
tags:
  - Abstractions
  - Systems Thinking
  - Architecture
featured: true
draft: false
---

Every abstraction is a bet.

The bet is this: *you will never need to know what is underneath here.* When the bet pays off, the abstraction is invisible and you get to think about your problem instead of someone else's. When the bet fails, you are suddenly debugging a system whose internals you were promised you would never have to learn.

Most of engineering happens comfortably inside the first case. Most of the *hard* parts of engineering happen in the second.

## Abstractions do not hide complexity, they relocate it

The common framing is that an abstraction hides complexity. That is not quite right, and the imprecision matters.

An abstraction *relocates* complexity — out of your code and into a contract. The complexity does not go anywhere. It is still there, being managed by someone, and it is still capable of surfacing. What the abstraction gives you is a smaller surface to reason about, in exchange for a dependency on that surface being honest.

Consider a filesystem `write()`. The contract is roughly: give me bytes and a descriptor, and the bytes are written. The relocated complexity is enormous — page cache, write-back scheduling, journal semantics, block allocation, the drive's own write cache, wear levelling on the underlying flash. None of it is your problem, right up until you care whether the data survives a power cut, at which point you discover that `write()` returning successfully means almost nothing about durability, and that the actual contract you needed involves `fsync()`, and that even `fsync()` has had a complicated history of error reporting across filesystems.

The abstraction did not hide the complexity of durable storage. It made a bet that you only cared about *ordering of bytes in a file*, not *survival of bytes across a crash*. For most programs that bet is correct. For a database it is catastrophic.

## Leaks are not random

Joel Spolsky's law of leaky abstractions says that all non-trivial abstractions leak. True, but it is often quoted as though leaks are arbitrary — an unpredictable tax you pay for using other people's code.

They are not arbitrary. Abstractions leak in structured, predictable places, and the structure is worth learning because it tells you where to look before you have a problem:

**They leak at performance boundaries.** An abstraction can make two operations look identical while their costs differ by orders of magnitude. An ORM makes a field access and a lazily-loaded relation traversal look like the same dot operator; one is a memory read and the other is a network round trip. Nothing in the syntax distinguishes them. This is the source of a large fraction of all N+1 query problems ever written, and it is not carelessness — it is the abstraction working exactly as designed.

**They leak at failure boundaries.** The happy path is what gets abstracted well, because the happy path is what the designer was thinking about. A remote procedure call is designed to look like a local function call, and it does — until it fails. A local call fails in exactly one interesting way: it throws. A remote call can fail by throwing, by timing out with the work never started, by timing out with the work already completed, by succeeding while the response is lost, or by hanging indefinitely because a middlebox silently dropped the connection. The abstraction is excellent at making the success case uniform and terrible at making the failure cases uniform, because the failure cases are precisely where local and remote genuinely differ.

**They leak at scale boundaries.** Behaviour that is correct at one order of magnitude stops being correct at the next. A connection pool of ten is a detail; a connection pool of ten thousand is an architecture. An in-memory cache is transparent until it becomes the thing that causes your garbage collector to pause for two seconds under load. Nothing about the abstraction changed. The scale moved past the range the design was tuned for.

**They leak at concurrency boundaries.** Sequential reasoning is the default mode of the human mind and of most APIs. Almost every interesting production failure involves two things happening at once in an order nobody wrote down.

If you know these four categories, you know where to point your attention when a system starts behaving strangely, before you have any specific hypothesis.

## The useful depth is one layer, not all of them

The obvious objection to any of this is that the stack is effectively infinite. Below your framework is a runtime, below that an operating system, below that firmware, below that silicon, below that physics. Nobody holds all of it. Anyone who claims to is describing an aspiration.

But you do not need all of it. In practice, the useful rule is narrower and much more achievable:

> Understand one layer below the one you work in — well enough to predict its behaviour under failure, under load, and under concurrency.

If you write application code against a database, you do not need to know how B-trees are laid out on disk. You *do* need to know that an index is a data structure with a maintenance cost, that a transaction holds locks for its duration, that an isolation level is a specific set of anomalies you have agreed to tolerate, and that "the query got slower" usually means the planner changed its mind about which access path to use.

That is one layer down. It is a finite amount of material. And it converts a large class of mysterious production incidents into ordinary, diagnosable engineering problems.

## Why this compounds

There is a practical argument for this beyond intellectual satisfaction, and it is about the shelf life of what you learn.

Knowledge of an interface expires when the interface changes. Knowledge of the *reasoning behind* an interface tends to survive, because the constraints that produced it are usually more durable than the interface itself.

The specific API of a message broker will change. The reason ordering guarantees are expensive — that ordering requires a serialisation point, and a serialisation point is a scalability bottleneck — will not change, because it is a consequence of what ordering means rather than of anyone's design choice. Learn the first and you know a product. Learn the second and you can predict the shape of every messaging system you will ever encounter, including the ones that do not exist yet.

This is also, I think, the most defensible answer to the question of what stays valuable as AI systems get better at producing code. Generating a plausible implementation is now cheap and getting cheaper. Knowing which of five plausible implementations survives contact with a network partition, a retry storm, or a 10x traffic increase requires a model of what is happening underneath — and that model is built by deliberately looking under the abstraction while things are calm, not by reading the generated code more carefully.

## What this site is for

That is the thread I want to pull on here: not how to use a technology, but why it works the way it does, what it is protecting you from, what it is quietly assuming about your problem, and what happens at the moment those assumptions stop holding.

Sometimes that means going one layer down into a specific system. Sometimes it means comparing the trade-offs of two designs that look interchangeable from above and are not. Sometimes it means writing down the reasoning behind a decision that seemed obvious at the time and turned out not to be.

The unifying question is always the same one: what is actually happening underneath, and what does it cost me not to know?
