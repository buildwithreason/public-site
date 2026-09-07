/**
 * Pure text helpers, kept free of Astro imports so they can be unit tested
 * with `node --test` directly. src/lib/content.ts re-exports them, so callers
 * are unaffected by the split.
 */

/** URL-safe slug for tag and category routes. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Derived from the body rather than typed into frontmatter, which is the kind
 * of field that silently goes stale after an edit. 220 wpm suits dense
 * technical prose read by engineers.
 */
export function readingTime(body: string | undefined): string {
  const words = (body ?? "").trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

/** Machine-readable date for <time datetime> and structured data. */
export function isoDate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

/**
 * Related-post scoring, split out from the collection lookup so the ranking
 * rule can be tested on plain objects: a shared category outweighs a shared
 * tag, and ties break towards the more recent piece.
 */
export interface Rankable {
  id: string;
  category: string;
  tags: string[];
  date: Date;
}

export function rankRelated<T extends Rankable>(current: T, all: T[], limit = 3): T[] {
  const tags = new Set(current.tags.map(slugify));

  return all
    .filter((a) => a.id !== current.id)
    .map((a) => {
      let score = a.category === current.category ? 3 : 0;
      for (const tag of a.tags) if (tags.has(slugify(tag))) score += 1;
      return { entry: a, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || y.entry.date.valueOf() - x.entry.date.valueOf())
    .slice(0, limit)
    .map((x) => x.entry);
}
