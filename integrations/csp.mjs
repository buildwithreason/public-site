import { createHash } from "node:crypto";
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Generates a Content-Security-Policy at build time and writes it into
 * dist/_headers, alongside the static rules from public/_headers.
 *
 * Every script this site ships is inline — Astro inlines them because they are
 * small — so a policy with `'unsafe-inline'` would permit any injected script
 * too, which is most of what CSP is for. Instead each distinct inline script is
 * hashed and listed. Browsers ignore `'unsafe-inline'` entirely once hashes are
 * present, so an injected script has no matching hash and does not run.
 *
 * The hashes are read from the built HTML, so they always describe what is
 * actually served rather than what the source implies.
 */

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.name.endsWith(".html")) yield full;
  }
}

/** Inline <script> elements that the browser will execute. */
function executableInlineScripts(html) {
  const found = [];
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const [, attrs, body] = m;
    if (/\ssrc\s*=/.test(attrs)) continue;              // external, covered by host allowlist
    if (/type\s*=\s*["']application\/ld\+json["']/.test(attrs)) continue; // data, never executed
    if (body.length) found.push(body);
  }
  return found;
}

export default function csp({ site }) {
  return {
    name: "csp-headers",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const outDir = dir.pathname;

        const hashes = new Set();
        for await (const file of htmlFiles(outDir)) {
          for (const body of executableInlineScripts(await readFile(file, "utf8"))) {
            hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
          }
        }

        // Where the newsletter form posts, when one is configured.
        const formHosts = site?.newsletter?.action
          ? [new URL(site.newsletter.action).origin]
          : [];

        const policy = [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "frame-ancestors 'none'",
          `form-action 'self'${formHosts.length ? " " + formHosts.join(" ") : ""}`,
          // Cloudflare injects its analytics beacon at the edge, after this build.
          // Giscus's client.js is injected by our own loader when comments open.
          `script-src 'self' ${[...hashes].join(" ")} https://static.cloudflareinsights.com https://giscus.app`,
          // Shiki writes per-token colours as style attributes, so inline styles
          // must be allowed. A stylesheet injection is far less dangerous than a
          // script injection, and script-src above is strict.
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "font-src 'self'",
          "connect-src 'self' https://giscus.app https://cloudflareinsights.com",
          "frame-src https://giscus.app",
          "upgrade-insecure-requests",
        ].join("; ");

        const headersPath = path.join(outDir, "_headers");
        let existing = "";
        try {
          existing = await readFile(headersPath, "utf8");
        } catch {
          /* public/_headers absent — write a fresh file */
        }

        // Append INTO the existing "/*" block. Only one rule block matches a
        // given path, so adding a second "/*" block silently replaces the first
        // and drops every header it declared.
        const line = `  Content-Security-Policy: ${policy}`;
        let out;
        if (/^\/\*\s*$/m.test(existing)) {
          const lines = existing.split("\n");
          const start = lines.findIndex((l) => l.trim() === "/*");
          let end = start + 1;
          while (end < lines.length && /^\s+\S/.test(lines[end])) end++;
          lines.splice(end, 0, line);
          out = lines.join("\n");
        } else {
          out = existing.trimEnd() + `\n\n/*\n${line}\n`;
        }
        await writeFile(headersPath, out.trimEnd() + "\n");

        logger.info(`CSP written with ${hashes.size} inline script hashes`);
      },
    },
  };
}
