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
   * Canonical origin, no trailing slash.
   * PLACEHOLDER — swap for the real domain once it is registered.
   * Used for canonical URLs, sitemap, RSS and Open Graph image URLs.
   */
  url: "https://kartikmavani.com",

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
