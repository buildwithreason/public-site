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
  company: "",

  /**
   * The publication. Secondary to the person.
   * Matches the registered domain, buildwithreason.com.
   */
  brand: "Build with Reason",

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
   * URLs are all built from it.
   *
   * The Workers deployment still answers on *.workers.dev and serves identical
   * content. Pointing canonical here means those pages declare this domain as
   * the original, which is what stops the two origins competing as duplicates.
   */
  url: "https://buildwithreason.com",

  /** Locale used for <html lang> and date formatting. */
  locale: "en",

  // --- Contact & social -----------------------------------------------------
  /** Leave a value empty to hide that link everywhere. */
  email: "",
  social: {
    github: "https://github.com/buildwithreason",
    linkedin: "https://www.linkedin.com/in/kartikmavani",
    x: "https://x.com/buildwithreas0n",
    youtube: "https://www.youtube.com/@buildwithreasons",
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
    /** Master switch. Rendering also requires both ids below to be non-empty. */
    enabled: true,

    /** owner/name of the repo holding the discussions. */
    repo: "buildwithreason/public-site",
    /** The repo's GitHub node id, verified against the public API. */
    repoId: "R_kgDOUP8K2w",

    /**
     * "Announcements" is intentional: only maintainers can open threads in it,
     * and Giscus creates them on your behalf. Readers can still comment on any
     * thread — it just stops anyone opening unrelated discussions there.
     */
    category: "Announcements",
    /** Node id for the Announcements category on this repo. */
    categoryId: "DIC_kwDOUP8K284DE_TW",

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

  // --- Analytics ------------------------------------------------------------
  /**
   * Cloudflare Web Analytics. Free, cookieless, and no personal data is
   * collected, so it needs no consent banner in the EU or UK.
   *
   * Get the token: Cloudflare dashboard > Analytics & Logs > Web Analytics >
   * Add a site > copy the value of `token` from the snippet it shows you.
   * Empty means no analytics script is emitted at all.
   */
  analytics: {
    cloudflareToken: "",
  },

  // --- Newsletter -----------------------------------------------------------
  /**
   * Email capture. RSS only reaches a narrow, technical slice of readers; a
   * list is the part of the audience you actually own.
   *
   * `action` is the form POST endpoint from whichever provider you use
   * (Buttondown, Kit, Ghost, Listmonk — all accept a plain form post).
   * `emailField` is the input name that provider expects. Empty `action`
   * means the form is not rendered anywhere.
   */
  newsletter: {
    action: "",
    emailField: "email",
    blurb: "One substantial piece a week on software, systems, cloud and AI. No noise.",
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
