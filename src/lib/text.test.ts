import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, readingTime, isoDate, rankRelated } from "./text.ts";

test("slugify handles the pillar names actually in use", () => {
  assert.equal(slugify("Distributed Systems"), "distributed-systems");
  // The ampersand pillar is the one that would silently produce "cloud--infrastructure"
  // if & were simply stripped rather than spelled out.
  assert.equal(slugify("Cloud & Infrastructure"), "cloud-and-infrastructure");
  assert.equal(slugify("AI Engineering"), "ai-engineering");
});

test("slugify produces URL-safe output from awkward input", () => {
  assert.equal(slugify("  Leading and trailing  "), "leading-and-trailing");
  assert.equal(slugify("C++ / Rust"), "c-rust");
  assert.equal(slugify("Node.js 24"), "node-js-24");
  assert.equal(slugify("---"), "");
  assert.match(slugify("Anything At All!"), /^[a-z0-9-]*$/);
});

test("slugify is stable — a slug slugifies to itself", () => {
  for (const s of ["Distributed Systems", "Cloud & Infrastructure", "RAG"]) {
    assert.equal(slugify(slugify(s)), slugify(s), `not stable for ${s}`);
  }
});

test("readingTime never reports zero minutes", () => {
  assert.equal(readingTime(""), "1 min read");
  assert.equal(readingTime(undefined), "1 min read");
  assert.equal(readingTime("one two three"), "1 min read");
});

test("readingTime scales with word count at 220wpm", () => {
  assert.equal(readingTime("word ".repeat(220)), "1 min read");
  assert.equal(readingTime("word ".repeat(1320)), "6 min read");
});

test("isoDate is UTC and date-only", () => {
  assert.equal(isoDate(new Date("2026-09-03T00:00:00Z")), "2026-09-03");
  // Late-evening UTC must not roll forward a day.
  assert.equal(isoDate(new Date("2026-09-03T23:59:00Z")), "2026-09-03");
});

const post = (id: string, category: string, tags: string[], date: string) => ({
  id, category, tags, date: new Date(date),
});

test("rankRelated prefers a shared pillar over a shared tag", () => {
  const current = post("a", "Distributed Systems", ["Kafka"], "2026-01-03");
  const sameCategory = post("b", "Distributed Systems", [], "2026-01-01");
  const sameTagOnly = post("c", "AI Engineering", ["Kafka"], "2026-01-02");
  const ranked = rankRelated(current, [current, sameTagOnly, sameCategory]);
  assert.deepEqual(ranked.map((r) => r.id), ["b", "c"]);
});

test("rankRelated excludes the current post and anything unrelated", () => {
  const current = post("a", "Distributed Systems", ["Kafka"], "2026-01-03");
  const unrelated = post("z", "Engineering Thinking", ["Hiring"], "2026-01-02");
  assert.deepEqual(rankRelated(current, [current, unrelated]), []);
});

test("rankRelated breaks ties towards the newer post and respects the limit", () => {
  const current = post("a", "Distributed Systems", [], "2026-01-01");
  const older = post("old", "Distributed Systems", [], "2026-01-02");
  const newer = post("new", "Distributed Systems", [], "2026-06-01");
  assert.deepEqual(rankRelated(current, [current, older, newer]).map((r) => r.id), ["new", "old"]);
  assert.equal(rankRelated(current, [current, older, newer], 1).length, 1);
});

test("rankRelated matches tags case-insensitively via slugify", () => {
  const current = post("a", "X", ["Distributed Systems"], "2026-01-02");
  const other = post("b", "Y", ["distributed systems"], "2026-01-01");
  assert.deepEqual(rankRelated(current, [current, other]).map((r) => r.id), ["b"]);
});
