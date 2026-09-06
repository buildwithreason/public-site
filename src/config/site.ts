/**
 * Single source of truth for global site values.
 *
 * The brand name is NOT final. Change `brand` here and it updates the header,
 * the page titles, the RSS feed, the footer and the OG metadata everywhere.
 * Nothing else in the codebase hardcodes it.
 */

export const siteConfig = {
  // --- Identity -------------------------------------------------------------
  /** The person. Always primary. */
  name: "Kartik Mavani",
  role: "Staff Software Engineer",
  company: "AWS",

  /**
   * The publication. Secondary to the person.
   * PLACEHOLDER — availability not yet verified across domains/platforms.
   */
  brand: "Built by Reason",

  /** The four domains, rendered as an eyebrow line. */
  disciplines: ["Software", "Systems", "Cloud", "AI"],

  /** The one primary tagline. Used on the homepage hero and as the meta description fallback. */
  tagline: "Understanding how technology works beneath the abstractions.",

  description:
    "Software, systems, cloud and AI — with a focus on the reasoning behind modern technology.",

  // --- Deployment -----------------------------------------------------------
  /**
   * Canonical origin, no trailing slash. Must match the origin that actually
   * serves the site — canonical tags, the sitemap, RSS links and Open Graph
   * URLs are all built from it, so a stale value points search engines and
   * social cards at a domain that does not resolve.
   *
   * Currently the Cloudflare Workers deployment. Change this in the same commit
   * that points the real domain at the site.
   */
  url: "https://kartik-mavani-site.kartikmavani.workers.dev",

  /** Locale used for <html lang> and date formatting. */
  locale: "en",

  // --- Contact & social -----------------------------------------------------
  /** Leave a value empty to hide that link everywhere. */
  email: "",
  social: {
    github: "https://github.com/KartikMavani",
    linkedin: "",
    x: "",
    youtube: "",
    tiktok: "",
    reddit: "",
  },

  // --- Comments (Giscus, backed by GitHub Discussions) ----------------------
  /**
   * Discussion threads under each article.
   *
   * Setup, in order — all four are required before this will render:
   *   1. The repo must be PUBLIC.
   *   2. Enable Discussions: repo Settings > General > Features > Discussions.
   *   3. Install the Giscus app: https://github.com/apps/giscus
   *   4. Visit https://giscus.app, enter the repo, and copy the generated
   *      `data-repo-id` and `data-category-id` into the fields below.
   *
   * Until `enabled` is true and both ids are filled in, the comments section
   * is not rendered and no third-party script is loaded.
   */
  comments: {
    enabled: false,

    /** owner/name of the repo holding the discussions. */
    repo: "kartikmavani/kartik-mavani-site",
    /** From giscus.app. Looks like "R_kgDO...". */
    repoId: "",

    /** Discussion category. "Announcements" keeps threads author-created only. */
    category: "Announcements",
    /** From giscus.app. Looks like "DIC_kwDO...". */
    categoryId: "",

    /**
     * Giscus themes per site theme. Built-in names ("light", "dark",
     * "dark_dimmed", "transparent_dark", "noborder_light", ...) or an absolute
     * https URL to a custom CSS theme.
     */
    theme: { light: "light", dark: "dark_dimmed" },

    reactionsEnabled: true,
    /** "top" puts the comment box above the thread. */
    inputPosition: "bottom" as "top" | "bottom",
    lang: "en",
  },

  // --- Navigation -----------------------------------------------------------
  nav: [
    { label: "Writing", href: "/writing" },
    { label: "Projects", href: "/projects" },
    { label: "About", href: "/about" },
    { label: "Now", href: "/now" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;

/** Social links that actually have a URL, in display order. */
export const activeSocials: Array<[label: string, href: string]> = (
  [
    ["GitHub", siteConfig.social.github],
    ["LinkedIn", siteConfig.social.linkedin],
    ["X", siteConfig.social.x],
    ["YouTube", siteConfig.social.youtube],
    ["TikTok", siteConfig.social.tiktok],
    ["Reddit", siteConfig.social.reddit],
  ] as Array<[string, string]>
).filter(([, href]) => Boolean(href));
