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
