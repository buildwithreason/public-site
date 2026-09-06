---
title: "RAG Is Not a Database"
description: "Retrieval-augmented generation is usually built as though a vector store were a database with fuzzy matching. It is a ranking system, and treating it as one changes almost every design decision."
date: 2026-09-03
category: "AI Engineering"
tags:
  - RAG
  - Retrieval
  - LLM Applications
  - Search
featured: false
draft: false
---

The reference architecture for retrieval-augmented generation is now so standard it barely needs describing: chunk the documents, embed the chunks, store the vectors, embed the query, take the top *k* nearest neighbours, paste them into the prompt.

It is easy to build, it demos well, and it produces a system that is quietly very different from what most teams think they have built.

The mental model that usually gets attached to it is *database with fuzzy matching*. Under that model, retrieval failures look like bugs — the right chunk was in there and the system did not return it, so something is broken and should be fixed.

The more accurate model is that you have built a **search engine with no relevance engineering and no evaluation**. Under that model, the same failures are not bugs. They are the expected behaviour of an unranked, untuned retrieval system, and they respond to a completely different set of interventions.

## What a vector store does not do

A database, in the sense most engineers use the word, provides a set of guarantees. A vector index provides almost none of them, and the differences are not incidental.

**It always returns results.** A SQL query with no matching rows returns zero rows. A nearest-neighbour query for *k* = 5 returns five chunks, always, no matter how unrelated they are to the question. There is no "not found." Ask a documentation corpus about a topic it has never covered and you will get the five least-unrelated chunks, delivered with the same interface and the same confidence as a perfect match.

This is the single most consequential difference, because "no relevant information exists" is a completely ordinary situation, and the retrieval layer has no way to express it. The distance scores are the only signal available, and raw cosine distances are not calibrated across queries — a threshold that filters correctly for one question will be wrong for the next.

**It is approximate on purpose.** Production vector indexes use approximate nearest-neighbour algorithms — HNSW, IVF, and their relatives — which trade recall for speed. The parameters that make queries fast are the same ones that make the index occasionally miss a genuinely nearest vector. Turning up `efSearch` or `nprobe` improves recall and costs latency. There is no setting that gives you both, and the default settings in most libraries are tuned for demos.

**There are no joins and no referential integrity.** A chunk is a free-floating string with a vector attached. Nothing enforces that a chunk which references "the previous section" has any way to reach it. Nothing prevents a chunk from a deprecated document from ranking above the current one. Any structure you want — document hierarchy, recency, authority, version — has to be carried in metadata that *you* filter on, and metadata filtering interacts badly with ANN indexes: a filter narrow enough to exclude most of the corpus can force the index into a slow path or degrade recall.

**Similarity is not relevance.** This is the deepest one. An embedding is a lossy projection of text into a fixed number of dimensions, trained on an objective that is usually something like "texts that appear in similar contexts should be near each other." That objective correlates with relevance. It is not the same thing.

Negation is the classic demonstration: "the transaction committed" and "the transaction did not commit" are close in most embedding spaces, because they share nearly all of their semantic content. So are two API methods that differ only in a version number. So are the correct answer and a superficially similar wrong answer. The embedding is not lying — those texts genuinely are similar under its objective. It simply was not trained to make the distinction your application depends on.

## Chunking is a schema decision that pretends not to be one

`chunk_size=512, overlap=50` is the most under-examined line in most RAG systems. It looks like a tuning parameter. It is the schema.

Chunk boundaries determine what can ever be retrieved together, and therefore what the model can ever reason over jointly. Split a table from its header and the numbers become unattributable. Split a procedure across two chunks and the model can retrieve step four without step three. Split a definition from the term it defines and neither chunk is useful alone.

Fixed-size chunking with overlap is a reasonable default precisely because it makes no assumptions — but making no assumptions about document structure is a strange choice when you usually know the structure perfectly well. Markdown has headings. Code has functions. Contracts have clauses. Splitting on the structure that already exists, and carrying the parent context into each chunk, is usually a larger quality improvement than any amount of embedding-model shopping.

And unlike a database schema, this one has no migration path. Changing your chunking strategy means re-chunking, re-embedding and re-indexing the entire corpus. Changing your embedding model means the same thing, because vectors from different models are not comparable — there is no partial migration, no dual-read window, no gradual rollout. It is a full rebuild, every time.

That is worth knowing before you pick, not after.

## Treat it as a ranking problem, because it is one

Once you accept that this is search, the fixes stop being speculative and start being a well-worn playbook that information retrieval has been refining since long before embeddings existed.

**Hybrid retrieval.** Dense vectors are good at paraphrase and bad at exact tokens. BM25 is the opposite — it will find the error code, the function name, the product SKU, the specific identifier the user typed. Running both and fusing the results (reciprocal rank fusion is a reasonable default and requires no score calibration) reliably beats either alone, and the failure modes are close to complementary.

**Rerank the candidates.** Retrieve 50, not 5. Then pass those 50 through a cross-encoder that scores each document *jointly* with the query rather than comparing two independently-computed vectors. Bi-encoders are fast because they never see the query and document together; cross-encoders are far more accurate for the same reason they are slower. Using the fast one to shortlist and the accurate one to order is the standard two-stage architecture, and it is usually the highest-leverage change available.

**Measure recall separately from answer quality.** This is the one that gets skipped, and it is the one that makes everything else possible. Build a set of questions with known answer locations — a few hundred is enough to be useful — and measure recall@k: how often is the correct chunk anywhere in what you retrieved?

That number splits your system in half. If recall@50 is 60%, no amount of prompt engineering will fix the other 40%, because the information never reached the model. If recall@50 is 95% and answers are still poor, the problem is in reranking, context assembly, or generation. Without that split, every quality problem is a single undifferentiated blob and every fix is a guess.

**Give the system a way to say no.** Since the retriever cannot express "nothing relevant," something downstream must. A reranker score threshold, a cheap relevance classifier, or an explicit instruction and a permitted refusal path all work. What does not work is hoping the model notices — given five confidently-supplied chunks, a model will generally try to use them.

## The reframe

None of this is an argument against RAG. Grounding a model in retrieved context is a genuinely good architecture, and it remains the most practical way to put a language model to work on information it was never trained on.

It is an argument against the framing. A vector store is not a database that happens to be fuzzy; it is a similarity index, and a similarity index is one component of a search system. The other components — hybrid retrieval, reranking, structural chunking, metadata filtering, evaluation — are not optional extras you add if quality is disappointing. They are the parts that make retrieval work, and their absence is why so many RAG systems plateau at "impressive demo, unreliable product."

The teams that get past that plateau are usually the ones who stopped debugging the prompt and started measuring recall.
