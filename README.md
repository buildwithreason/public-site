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

### Currently deployed on Cloudflare Workers

The live site is served by Workers static assets at
`https://kartik-mavani-site.kartikmavani.workers.dev`, not Pages. Both serve the same
`dist/` output and the build settings above are unchanged; Workers is simply the newer
of the two products.

**`siteConfig.url` must match whatever origin actually serves the site.** Canonical tags,
`og:url`, the sitemap and every RSS link are built from it, so a stale value points search
engines and social cards at a domain that does not resolve. Change it in the same commit
that points a new domain at the site — that is the single edit a domain migration needs.

Two things to know about the current deployment:

- **Trailing slashes.** Workers static assets defaults to `auto-trailing-slash`, so
  `/writing/kafka-ordering` 301s to `/writing/kafka-ordering/` while Astro emits the
  slash-free form in canonical tags and the sitemap. Harmless — search engines follow the
  redirect — but it can be tidied by setting `html_handling: "drop-trailing-slash"` in the
  Workers config, or by switching Astro to `trailingSlash: "always"`. Left alone for now
  rather than changing deployment behaviour blind.
- **Indexing a temporary domain.** `*.workers.dev` is indexable. If a permanent domain is
  coming soon, consider whether you want search engines building up an index against a URL
  you intend to abandon.

`public/_headers` sets immutable caching for hashed assets and fonts, plus baseline
security headers. Cloudflare picks it up automatically.

---

## Comments (Giscus)

Article discussions are backed by **GitHub Discussions** via
[Giscus](https://giscus.app). Threads live in this repo, so there is no third-party
account, no database and no moderation dashboard to run — you moderate in GitHub.

**Configured and live.** The repo is public, Discussions is enabled, the Giscus app is
installed, and both ids are set in `src/config/site.ts`.

Threads land in the **Announcements** category. That is deliberate: only maintainers can
open threads there, and Giscus creates them on your behalf, so nobody can start unrelated
discussions in it. Readers can still comment and react on any thread.

No discussion exists for an article until its first comment — Giscus creates it on demand.
Moderation happens in GitHub Discussions; there is no separate dashboard.

### If the ids ever need regenerating

Go to <https://giscus.app>, enter `kartikmavani/kartik-mavani-site`, and copy the
generated `data-repo-id` and `data-category-id` into `comments` in `src/config/site.ts`.

### How it behaves

- **Nothing loads until the reader scrolls to the end of an article.** An
  IntersectionObserver injects the Giscus loader 400px before the section enters view,
  so most visitors never make a request to `giscus.app` at all.
- **Threads are keyed by a stable term**, `writing/<slug>`, using `mapping: "specific"`
  rather than `pathname`. Pathname varies with trailing slashes depending on how the host
  serves directory-format output, and two spellings of one URL would silently create two
  separate threads. A term derived from the content id cannot drift.
- **The embed follows the site theme**, including the manual toggle, via `postMessage`.
  Set the light and dark Giscus themes under `comments.theme`; both accept built-in names
  or an absolute https URL to a custom CSS theme.
- **Without JavaScript**, readers get a link straight to the repo's Discussions page.
- The section carries `data-state` (`idle` → `loading` → `ready`), which drives the
  loading line and is handy when debugging.

### Turning it off

Globally: `enabled: false` in `src/config/site.ts`.
For one article: `comments: false` in its frontmatter.
Drafts never render comments.

### The trade-off

This is the only third-party code on the site. When a reader reaches the comments, it
loads an iframe from `giscus.app`, which in turn talks to GitHub — that is a real
third-party request with the reader's IP, and posting requires a GitHub account. The lazy
loading limits it to people who actually scroll that far, but it is a genuine departure
from the otherwise self-contained, ~550-byte-of-JavaScript design. Worth knowing before
switching it on.

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
- [x] Comments: repo public, Discussions enabled, Giscus app installed, ids configured.
