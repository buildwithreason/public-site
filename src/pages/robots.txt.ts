import type { APIRoute } from "astro";
import { siteConfig } from "../config/site";

// Generated rather than static so the sitemap URL follows the configured domain.
export const GET: APIRoute = () =>
  new Response(
    `User-agent: *
Allow: /

Sitemap: ${new URL("sitemap-index.xml", siteConfig.url).href}
`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
