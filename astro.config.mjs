// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import csp from "./integrations/csp.mjs";
import verify from "./integrations/verify.mjs";
import { siteConfig } from "./src/config/site.ts";

export default defineConfig({
  // Canonical origin. Drives sitemap, RSS and Open Graph URLs.
  site: siteConfig.url,

  // Static output. Cloudflare Pages serves `dist/` directly — no server runtime.
  output: "static",

  trailingSlash: "never",

  integrations: [sitemap(), csp({ site: siteConfig }), verify()],

  // The floating dev toolbar overlays the bottom of every page while running
  // `astro dev`. It is never part of a production build either way.
  devToolbar: { enabled: false },

  markdown: {
    shikiConfig: {
      // Dual themes so code blocks follow the site's light/dark tokens
      // without shipping a highlighting runtime to the browser.
      themes: {
        light: "github-light",
        dark: "github-dark-dimmed",
      },
      wrap: false,
    },
  },

  build: {
    // Emit /writing/slug/index.html so URLs stay extensionless.
    format: "directory",
    inlineStylesheets: "auto",
  },

  vite: {
    build: {
      // The site ships almost no JS; keep whatever there is uncompressed-size honest.
      assetsInlineLimit: 2048,
    },
  },
});
