import type { APIRoute } from "astro";
import { ogResponse } from "../lib/og";
import { siteConfig } from "../config/site";

/** Default card, used by every page that has no card of its own. */
export const GET: APIRoute = () =>
  ogResponse({
    title: siteConfig.tagline,
    eyebrow: siteConfig.disciplines.join("  ·  "),
    meta: `${siteConfig.role} at ${siteConfig.company}`,
  });
