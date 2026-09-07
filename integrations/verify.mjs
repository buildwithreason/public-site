import { readFile, readdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

/**
 * Build-time assertions over the built output.
 *
 * Every check here exists because the corresponding bug actually shipped, or
 * came close to. They run against dist/ rather than source, because that is
 * where each of those bugs was visible and where several of them were invisible
 * in the source that produced them.
 *
 * A failure fails the build. That is the point: a build that produces pages
 * without social cards, or drops half its security headers, should not deploy.
 */

const checks = [];
const check = (name, fn) => checks.push({ name, fn });

async function* walk(dir, ext) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full, ext);
    else if (e.name.endsWith(ext)) yield full;
  }
}

const exists = (p) => access(p).then(() => true, () => false);
const attr = (html, re) => (html.match(re) || [])[1] ?? null;

// --- per-page metadata -----------------------------------------------------
// Shipped once: every page had no og:image at all, so every link shared to
// LinkedIn or X rendered as a bare text card.
check("every page has complete metadata and a social card that exists", async (dist) => {
  const problems = [];
  for await (const file of walk(dist, ".html")) {
    const rel = file.slice(dist.length);
    const html = await readFile(file, "utf8");
    if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`${rel}: no <title>`);
    if (!attr(html, /<meta name="description" content="([^"]+)"/)) problems.push(`${rel}: no meta description`);
    if (!attr(html, /<link rel="canonical" href="([^"]+)"/)) problems.push(`${rel}: no canonical`);
    if (!attr(html, /<meta property="og:title" content="([^"]+)"/)) problems.push(`${rel}: no og:title`);
    if (!attr(html, /<meta name="twitter:card" content="([^"]+)"/)) problems.push(`${rel}: no twitter:card`);

    const og = attr(html, /<meta property="og:image" content="([^"]+)"/);
    if (!og) {
      problems.push(`${rel}: no og:image`);
    } else {
      const local = path.join(dist, new URL(og).pathname);
      if (!(await exists(local))) problems.push(`${rel}: og:image 404s -> ${og}`);
    }
  }
  return problems;
});

// --- internal links --------------------------------------------------------
// Shipped once: /projects was linked from the nav, footer and hero while it had
// no published entries, so all three led to "No projects published yet".
check("every internal link resolves to a real file", async (dist) => {
  const problems = [];
  for await (const file of walk(dist, ".html")) {
    const rel = file.slice(dist.length);
    const html = await readFile(file, "utf8");
    for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
      const href = m[1];
      if (href.startsWith("//")) continue;
      const candidates = [
        path.join(dist, href),
        path.join(dist, href, "index.html"),
        path.join(dist, href + ".html"),
      ];
      const ok = (await Promise.all(candidates.map(exists))).some(Boolean);
      if (!ok) problems.push(`${rel}: dead link -> ${href}`);
    }
  }
  return [...new Set(problems)];
});

// --- headers ---------------------------------------------------------------
// Nearly shipped: a second "/*" block was appended to _headers, and because only
// one block matches a path it REPLACED the first, silently dropping every
// security header the site already had.
check("_headers has one /* block carrying every required header", async (dist) => {
  const problems = [];
  const file = path.join(dist, "_headers");
  if (!(await exists(file))) return ["_headers missing from the build"];
  const text = await readFile(file, "utf8");

  const blocks = text.split("\n").filter((l) => l.trim() === "/*").length;
  if (blocks !== 1) problems.push(`expected exactly one "/*" block, found ${blocks} — a second one replaces the first`);

  for (const h of [
    "X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options",
    "Permissions-Policy", "Strict-Transport-Security",
    "Cross-Origin-Opener-Policy", "Cross-Origin-Resource-Policy",
    "Content-Security-Policy",
  ]) {
    if (!new RegExp(`^\\s+${h}:`, "m").test(text)) problems.push(`missing header: ${h}`);
  }
  return problems;
});

// --- CSP correctness -------------------------------------------------------
// Nearly shipped: the CSP omitted giscus.app from style-src, and the comments
// client injects its stylesheet into the host page, so threads would have
// rendered unstyled.
check("CSP hashes every inline script and allows what the page really loads", async (dist) => {
  const problems = [];
  const headers = await readFile(path.join(dist, "_headers"), "utf8");
  const csp = (headers.match(/Content-Security-Policy: (.+)/) || [])[1];
  if (!csp) return ["no Content-Security-Policy in _headers"];

  for (const [directive, host] of [
    ["script-src", "https://giscus.app"],
    ["style-src", "https://giscus.app"],
    ["frame-src", "https://giscus.app"],
    ["connect-src", "https://giscus.app"],
    ["script-src", "https://static.cloudflareinsights.com"],
  ]) {
    const d = (csp.match(new RegExp(`${directive} ([^;]+)`)) || [])[1] ?? "";
    if (!d.includes(host)) problems.push(`${directive} must allow ${host}`);
  }

  // Any inline script without a matching hash simply will not run in production.
  for await (const file of walk(dist, ".html")) {
    const html = await readFile(file, "utf8");
    for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      const [, attrs, body] = m;
      if (/\ssrc\s*=/.test(attrs) || /application\/ld\+json/.test(attrs) || !body.length) continue;
      const hash = createHash("sha256").update(body, "utf8").digest("base64");
      if (!csp.includes(hash)) {
        problems.push(`${file.slice(dist.length)}: inline script has no CSP hash — it will be blocked`);
      }
    }
  }
  return [...new Set(problems)];
});

// --- shared behaviours -----------------------------------------------------
// Shipped once: the progress bar existed only on articles and projects, and
// project pages rendered a contents rail with no script driving it at all.
check("reading behaviours are present everywhere they should be", async (dist) => {
  const problems = [];
  for await (const file of walk(dist, ".html")) {
    const rel = file.slice(dist.length);
    const html = await readFile(file, "utf8");

    if (!html.includes("data-progress")) problems.push(`${rel}: no reading progress bar`);

    const isLongForm = /\/writing\/[^/]+\/index\.html$/.test(rel) || /\/projects\/[^/]+\/index\.html$/.test(rel);
    if (isLongForm) {
      const headings = (html.match(/<h[23][^>]*\sid="/g) || []).length;
      if (headings >= 3 && !html.includes("data-toc-link")) {
        problems.push(`${rel}: ${headings} headings but no contents list`);
      }
      if (html.includes("data-toc-link") && !html.includes("heading-anchor") && !html.includes("data-copy-link")) {
        problems.push(`${rel}: contents rail with no behaviour script`);
      }
    }
  }
  return problems;
});

// --- markup validity -------------------------------------------------------
// Nearly shipped: the table of contents renders twice (rail and inline) and
// initially gave both copies the same element id.
check("no duplicate element ids", async (dist) => {
  const problems = [];
  for await (const file of walk(dist, ".html")) {
    const html = await readFile(file, "utf8");
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
    for (const d of new Set(dupes)) problems.push(`${file.slice(dist.length)}: duplicate id "${d}"`);
  }
  return problems;
});

// --- feeds and discovery ---------------------------------------------------
check("sitemap and feed cover the published articles", async (dist) => {
  const problems = [];
  const sitemap = (await Promise.all(
    (await readdir(dist)).filter((f) => f.startsWith("sitemap") && f.endsWith(".xml"))
      .map((f) => readFile(path.join(dist, f), "utf8"))
  )).join("");
  if (!sitemap) return ["no sitemap generated"];

  const rss = await readFile(path.join(dist, "rss.xml"), "utf8");
  for await (const file of walk(path.join(dist, "writing"), ".html")) {
    const rel = file.slice(dist.length).replace(/\/index\.html$/, "");
    if (/\/writing\/(tags|categories)/.test(rel)) continue;
    if (rel === "/writing") continue;
    if (!sitemap.includes(rel)) problems.push(`${rel} missing from sitemap`);
    if (!rss.includes(rel)) problems.push(`${rel} missing from RSS`);
  }
  return problems;
});

// --- canonical hygiene -----------------------------------------------------
check("no insecure or placeholder URLs in the output", async (dist) => {
  const problems = [];
  for await (const file of walk(dist, ".html")) {
    const html = await readFile(file, "utf8");
    const rel = file.slice(dist.length);
    if (/http:\/\/buildwithreason\.com/.test(html)) problems.push(`${rel}: insecure http:// self-link`);
    if (/kartikmavani\.com|workers\.dev/.test(html)) problems.push(`${rel}: stale domain reference`);
  }
  return [...new Set(problems)];
});

export default function verify() {
  return {
    name: "verify-build",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const dist = dir.pathname.replace(/\/$/, "");
        const failures = [];

        for (const { name, fn } of checks) {
          const problems = await fn(dist);
          if (problems.length) {
            failures.push({ name, problems });
            logger.error(`✗ ${name}`);
            for (const p of problems.slice(0, 8)) logger.error(`    ${p}`);
            if (problems.length > 8) logger.error(`    …and ${problems.length - 8} more`);
          } else {
            logger.info(`✓ ${name}`);
          }
        }

        if (failures.length) {
          throw new Error(
            `Build verification failed: ${failures.length} of ${checks.length} checks. See errors above.`
          );
        }
        logger.info(`all ${checks.length} build checks passed`);
      },
    },
  };
}
