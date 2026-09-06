import { getCollection, type CollectionEntry } from "astro:content";
import { siteConfig } from "../config/site";

export type Article = CollectionEntry<"articles">;
export type Project = CollectionEntry<"projects">;

/**
 * Drafts stay visible while running `astro dev` so work-in-progress can live in
 * the repo, and disappear from every production build.
 */
const isVisible = (entry: { data: { draft: boolean } }) =>
  import.meta.env.PROD ? !entry.data.draft : true;

const byNewest = (a: Article, b: Article) =>
  b.data.date.valueOf() - a.data.date.valueOf();

export async function getArticles(): Promise<Article[]> {
  const articles = await getCollection("articles", isVisible);
  return articles.sort(byNewest);
}

export async function getFeaturedArticles(limit = 3): Promise<Article[]> {
  const articles = await getArticles();
  const featured = articles.filter((a) => a.data.featured);
  // Fall back to the most recent writing so the homepage is never empty.
  return (featured.length ? featured : articles).slice(0, limit);
}

export async function getProjects(): Promise<Project[]> {
  const projects = await getCollection("projects", isVisible);
  return projects.sort((a, b) => a.data.order - b.data.order);
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

export function formatDate(date: Date): string {
  return date.toLocaleDateString(siteConfig.locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Machine-readable date for <time datetime> and structured data. */
export function isoDate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

/** Group articles by category, preserving the newest-first order within each. */
export function groupByCategory(articles: Article[]): Map<string, Article[]> {
  const groups = new Map<string, Article[]>();
  for (const article of articles) {
    const list = groups.get(article.data.category) ?? [];
    list.push(article);
    groups.set(article.data.category, list);
  }
  return groups;
}

/** URL-safe slug for tag and category routes. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface Adjacent {
  newer?: Article;
  older?: Article;
}

/**
 * Neighbours in publication order. Articles are sorted newest-first, so the
 * previous index is the newer piece.
 */
export function getAdjacent(articles: Article[], id: string): Adjacent {
  const i = articles.findIndex((a) => a.id === id);
  if (i === -1) return {};
  return { newer: articles[i - 1], older: articles[i + 1] };
}

/**
 * Related reading, scored rather than random: a shared category is worth more
 * than a shared tag, and ties break towards the more recent piece.
 */
export function getRelated(current: Article, all: Article[], limit = 3): Article[] {
  const tags = new Set(current.data.tags.map(slugify));

  return all
    .filter((a) => a.id !== current.id)
    .map((a) => {
      let score = a.data.category === current.data.category ? 3 : 0;
      for (const tag of a.data.tags) if (tags.has(slugify(tag))) score += 1;
      return { article: a, score };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (x, y) =>
        y.score - x.score || y.article.data.date.valueOf() - x.article.data.date.valueOf()
    )
    .slice(0, limit)
    .map((entry) => entry.article);
}

/** Every tag in use, with counts, most used first. */
export async function getTags(): Promise<Array<{ name: string; slug: string; count: number }>> {
  const articles = await getArticles();
  const counts = new Map<string, { name: string; count: number }>();

  for (const article of articles) {
    for (const tag of article.data.tags) {
      const slug = slugify(tag);
      const entry = counts.get(slug) ?? { name: tag, count: 0 };
      entry.count += 1;
      counts.set(slug, entry);
    }
  }

  return [...counts.entries()]
    .map(([slug, { name, count }]) => ({ slug, name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Categories in use, with counts, in the pillar order declared in the schema. */
export async function getCategories(): Promise<
  Array<{ name: string; slug: string; count: number }>
> {
  const articles = await getArticles();
  const counts = new Map<string, number>();
  for (const article of articles) {
    counts.set(article.data.category, (counts.get(article.data.category) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({
    name,
    slug: slugify(name),
    count,
  }));
}

/**
 * Navigation with dead ends removed.
 *
 * /projects has no published entries yet, and a nav link leading to "No
 * projects published yet" costs more credibility than the missing link does.
 * The item returns on its own the moment a project ships — no flag to remember
 * to flip.
 */
export async function getNav(): Promise<Array<{ label: string; href: string }>> {
  const projects = await getProjects();
  return siteConfig.nav.filter(
    (item) => !(item.href === "/projects" && projects.length === 0)
  );
}
