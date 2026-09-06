import type { APIRoute, GetStaticPaths } from "astro";
import { ogResponse } from "../../../lib/og";
import { getArticles, formatDate, readingTime, type Article } from "../../../lib/content";

export const getStaticPaths = (async () => {
  const articles = await getArticles();
  return articles.map((article) => ({
    params: { slug: article.id },
    props: { article },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { article } = props as { article: Article };
  return ogResponse({
    title: article.data.title,
    eyebrow: article.data.category,
    meta: `${formatDate(article.data.date)}  ·  ${readingTime(article.body)}`,
  });
};
