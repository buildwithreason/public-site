import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { siteConfig } from "../config/site";

export async function GET(context) {
  const articles = (await getCollection("articles", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: `${siteConfig.brand} — ${siteConfig.name}`,
    description: siteConfig.description,
    site: context.site,
    trailingSlash: false,
    items: articles.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.date,
      link: `/writing/${article.id}`,
      categories: [article.data.category, ...article.data.tags],
      author: siteConfig.name,
    })),
    customData: `<language>en-us</language><copyright>© ${new Date().getFullYear()} ${siteConfig.name}</copyright>`,
  });
}
