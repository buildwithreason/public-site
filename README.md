# kartik-mavani-site

Personal site and technical publication for Kartik Mavani — Staff Software Engineer.
Astro, static output, deployed to Cloudflare Pages.

```bash
npm install
npm run dev      # http://localhost:4321 — drafts visible
npm run build    # -> dist/  — drafts excluded
npm run preview  # serve dist/ locally
npm run check    # TypeScript + Astro diagnostics
```

---

## Publishing an article

One file. Nothing else to register.

```bash
touch src/content/articles/why-retries-are-dangerous.md
```

```markdown
---
title: "Why Retries Are Dangerous"
description: "Retrying a failed request is the most common way to turn a small outage into a large one."
date: 2026-09-14
category: "Distributed Systems"
tags: ["Reliability", "Idempotency"]
featured: false
draft: false
---

Body goes here.
```

```bash
git add . && git commit -m "Add: why retries are dangerous" && git push
```

Cloudflare rebuilds on push. The article is live in well under a minute, and it
automatically appears in `/writing`, the RSS feed, the sitemap, and on the homepage if
`featured: true`.

**The filename is the URL.** `why-retries-are-dangerous.md` becomes
`/writing/why-retries-are-dangerous`. No dates in URLs. Renaming a file breaks its
permalink, so pick the slug once.

### Frontmatter reference

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Max 90 characters. |
| `description` | yes | 40–200 characters. Used as the meta description, the card blurb, the RSS summary and the standfirst under the headline. Write it as a real sentence. |
| `date` | yes | `YYYY-MM-DD`. Drives ordering. |
| `category` | yes | Must be one of the six pillars — see below. A typo fails the build. |
| `tags` | no | Free-form list. |
| `featured` | no | Surfaces on the homepage. Defaults to `false`. |
| `draft` | no | Visible in `npm run dev`, excluded from the production build. |
| `image` | no | Absolute path, e.g. `/images/og/kafka-ordering.png`. Becomes the OG/Twitter card. |
| `updated` | no | Renders "Updated <date>" when later than `date`. |
| `canonical` | no | Set when first published elsewhere. |

Reading time is **computed from the word count** — do not add it to frontmatter.

The six valid categories, defined in `src/content.config.ts`:

```
Software Engineering
Distributed Systems
Cloud & Infrastructure
AI Engineering
Engineering Thinking
Future of Software Engineering
```

To add a seventh, edit the `CATEGORIES` array in that file.

### Projects

Same idea, in `src/content/projects/`. Fields: `title`, `description`, `year`, `status`
(`Active` / `Experiment` / `Archived`), `order` (lower sorts first), `tech`, `repo`,
`demo`, `featured`, `draft`.

---

## Changing the brand name or domain

Everything global lives in **`src/config/site.ts`** — brand name, tagline, domain,
role, employer, social URLs, navigation. Nothing else hardcodes them.

The brand name is **not final**. Change `brand` in that file and it updates the header,
page titles, RSS channel, footer and Open Graph metadata everywhere at once.

Two placeholders to replace before launch:

- `brand: "Built by Reason"` — availability not yet verified across domains and platforms.
- `url: "https://kartikmavani.com"` — this drives canonical URLs, the sitemap, RSS links
  and OG image URLs. It must match the real domain or those will all be wrong.

An empty string in `social` hides that link everywhere, so unused platforms can stay
listed as reminders.

`/now` content lives in `src/config/now.ts`, shared between the `/now` page and the
homepage "Currently" block so the two cannot drift apart.

---

## Deploying to Cloudflare Pages

Push to GitHub, then in the Cloudflare dashboard: **Workers & Pages → Create → Pages →
Connect to Git**.

| Setting | Value |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 20 or later (set `NODE_VERSION` if the default is older) |

No environment variables and no server runtime — the output is static files. Every push
to the default branch deploys; pull requests get preview URLs automatically.

Add the custom domain under **Custom domains** once DNS is ready, and update
`siteConfig.url` in the same change so metadata matches.

`public/_headers` sets immutable caching for hashed assets and fonts, plus baseline
security headers. Cloudflare picks it up automatically.

---

## Structure

```
src/
  config/site.ts        every global value — brand, domain, socials, nav
  config/now.ts         /now content, shared with the homepage
  content.config.ts     collection schemas; invalid frontmatter fails the build
  content/articles/     one markdown file per article
  content/projects/     one markdown file per project
  lib/content.ts        draft filtering, sorting, reading time, date formatting
  layouts/              BaseLayout, ArticleLayout, ProjectLayout
  components/           Header, Footer, Hero, cards, BaseHead (all SEO tags)
  pages/                routes; [slug].astro generates article and project pages
  styles/global.css     design tokens, reset, prose and code styles
public/
  fonts/                self-hosted variable fonts (OFL, licenses included)
  _headers              Cloudflare caching and security headers
```

## Design and performance notes

- **Type.** Source Serif 4 for headlines and article body, Inter for UI and structural
  headings, JetBrains Mono for code. Self-hosted, latin + latin-ext subsets only, variable
  weight axis, two faces preloaded.
- **Colour.** Warm off-white ground, charcoal ink, one restrained rust accent used only
  for links and marks. Light and dark are both first-class; dark follows the OS by default
  and the toggle overrides it.
- **JavaScript.** Roughly 550 bytes total, inlined: a blocking theme-restore snippet and
  the toggle handler. No framework, no hydration.
- **Navigation** does not collapse behind a menu button — four short items fit a 320px
  viewport, so the links stay tappable and the script count stays at zero.
- Code blocks deliberately extend past the prose measure to the column edge; prose stays
  at roughly 68 characters.

---

## Before launch

- [ ] Verify **Built by Reason** across domain, GitHub org, YouTube, X, LinkedIn, Reddit —
      then set `brand` in `src/config/site.ts`.
- [ ] Register the domain and update `siteConfig.url`.
- [ ] Fill in the remaining social URLs in `siteConfig.social`.
- [ ] Complete `src/content/projects/agentic-news-engine.md` and set `draft: false`.
      **`/projects` is empty in production until this is done.**
- [ ] Add a second and third project.
- [ ] Add `/public/images/og-default.png` (1200×630) and wire it as the fallback in
      `BaseHead.astro`, or set `image` per article. Without it, shared links render as
      plain text cards.
- [ ] Review the four seeded articles and rewrite anything that does not sound like you.
- [ ] Set up a domain email and add it to `siteConfig.email`.
