import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
// `z` re-exported from astro:content is deprecated and removed in Astro 8.
import { z } from "astro/zod";

/**
 * The six content pillars. Declared as an enum so a typo in a article's
 * `category` fails the build instead of quietly creating a seventh pillar.
 */
export const CATEGORIES = [
  "Software Engineering",
  "Distributed Systems",
  "Cloud & Infrastructure",
  "AI Engineering",
  "Engineering Thinking",
  "Future of Software Engineering",
] as const;

/**
 * An empty YAML key (`demo:`) parses as null, which would otherwise fail an
 * optional() check. Treat empty and null as "not provided" so leaving a key in
 * place as a reminder is harmless.
 */
const optionalUrl = z.preprocess(
  (v) => (v === null || v === "" ? undefined : v),
  z.url().optional()
);

const optionalText = z.preprocess(
  (v) => (v === null || v === "" ? undefined : v),
  z.string().optional()
);

const articles = defineCollection({
  loader: glob({ base: "./src/content/articles", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string().max(90),
    /** Used verbatim as the meta description and the card blurb. Keep it a real sentence. */
    description: z.string().min(40).max(200),
    date: z.coerce.date(),
    category: z.enum(CATEGORIES),
    tags: z.array(z.string()).default([]),
    /** Featured articles surface on the homepage, newest first. */
    featured: z.boolean().default(false),
    /** Drafts render in `astro dev` but are excluded from every production build. */
    draft: z.boolean().default(false),
    /** Set when the piece was first published elsewhere. */
    canonical: optionalUrl,
    /** Absolute path under /public, e.g. "/images/og/kafka-ordering.png". */
    image: optionalText,
    /** Shown as "Updated <date>" when present and later than `date`. */
    updated: z.coerce.date().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ base: "./src/content/projects", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string().max(90),
    description: z.string().min(40).max(200),
    /** Ordering key for the projects index and homepage. Lower sorts first. */
    order: z.number().default(100),
    status: z.enum(["Active", "Experiment", "Archived"]).default("Active"),
    year: z.string(),
    /** Rendered as tags on the card and detail page. */
    tech: z.array(z.string()).default([]),
    repo: optionalUrl,
    demo: optionalUrl,
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles, projects };
