import type { APIRoute } from "astro";
import { getArticles, isoDate, readingTime } from "../lib/content";

/** Rough markdown -> plain text. Good enough for substring matching. */
function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")      // fenced code
    .replace(/`[^`]*`/g, " ")             // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> text
    .replace(/^>\s?/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Search index, built at compile time and fetched lazily the first time the
 * reader opens the palette.
 *
 * Body text is capped per article deliberately. Indexing full bodies would
 * search better but grows without bound — at roughly one article a week the
 * index would pass a megabyte within two years, and it is downloaded in one
 * request. The cap keeps it near 1KB per article. If deep full-text search
 * matters later, that is the point to move to a real index (Pagefind builds
 * one at compile time and loads it in fragments).
 */
const BODY_CHARS = 600;

export const GET: APIRoute = async () => {
  const articles = await getArticles();

  const index = articles.map((article) => ({
    title: article.data.title,
    description: article.data.description,
    category: article.data.category,
    tags: article.data.tags,
    url: `/writing/${article.id}`,
    date: isoDate(article.data.date),
    readingTime: readingTime(article.body),
    body: toPlainText(article.body ?? "").slice(0, BODY_CHARS),
  }));

  return new Response(JSON.stringify(index), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
};
