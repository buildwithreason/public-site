import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { siteConfig } from "../config/site";

/**
 * Open Graph card generation, at build time.
 *
 * Runs only during `astro build`: satori lays out the card and produces SVG,
 * resvg rasterises it to PNG. Neither library — nor the fonts they use — is
 * ever sent to a browser. Both are devDependencies for that reason.
 *
 * Fonts are .woff rather than the .woff2 the site serves, because satori
 * cannot read woff2.
 */

const WIDTH = 1200;
const HEIGHT = 630;

// Matches the site's light palette.
const BG = "#fbfaf8";
const INK = "#17181b";
const MUTED = "#6c7078";
const FAINT = "#8b8f97";
const ACCENT = "#8c3f1d";
const RULE = "#e3dfd6";

/**
 * Resolved from the project root rather than import.meta.url: this module is
 * bundled into dist/.prerender during the build, and the bundler does not carry
 * the font files along with it. `astro build` always runs from the project
 * root, which is where Cloudflare runs it too.
 */
const fontFile = (name: string) =>
  readFile(path.resolve(process.cwd(), "src/assets/og-fonts", name));

let cached: Awaited<ReturnType<typeof loadFonts>> | null = null;

async function loadFonts() {
  const [serif, sans, sansBold] = await Promise.all([
    fontFile("source-serif-4-latin-600-normal.woff"),
    fontFile("inter-latin-400-normal.woff"),
    fontFile("inter-latin-600-normal.woff"),
  ]);
  return [
    { name: "Serif", data: serif, weight: 600 as const, style: "normal" as const },
    { name: "Sans", data: sans, weight: 400 as const, style: "normal" as const },
    { name: "Sans", data: sansBold, weight: 600 as const, style: "normal" as const },
  ];
}

/** Read the fonts once per build rather than once per page. */
async function fonts() {
  cached ??= await loadFonts();
  return cached;
}

type Node = { type: string; props: Record<string, unknown> };

const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, ...(children === undefined ? {} : { children }) },
});

/** Long headlines step down so they never overflow the card. */
function titleSize(title: string): number {
  if (title.length > 78) return 50;
  if (title.length > 52) return 58;
  return 68;
}

export interface OgOptions {
  title: string;
  /** Small line above the title — the pillar, or a section name. */
  eyebrow?: string;
  /** Small line under the rule, e.g. reading time. */
  meta?: string;
}

export async function renderOgImage({ title, eyebrow, meta }: OgOptions): Promise<Buffer> {
  // The favicon motif: layers of abstraction with one line going through them.
  const mark = el(
    "div",
    { display: "flex", flexDirection: "column", gap: 7, position: "relative", width: 54 },
    [
      el("div", { width: 54, height: 3, background: INK, opacity: 0.3, borderRadius: 2 }),
      el("div", { width: 54, height: 3, background: INK, opacity: 0.55, borderRadius: 2 }),
      el("div", { width: 54, height: 3, background: INK, opacity: 0.85, borderRadius: 2 }),
      el("div", {
        position: "absolute",
        left: 25,
        top: -9,
        width: 3,
        height: 45,
        background: ACCENT,
        borderRadius: 2,
      }),
    ]
  );

  const svg = await satori(
    el(
      "div",
      {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BG,
        padding: "68px 76px",
        fontFamily: "Sans",
      },
      [
        // Top: pillar + mark
        el(
          "div",
          { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
          [
            el(
              "div",
              {
                display: "flex",
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: ACCENT,
              },
              eyebrow ?? siteConfig.disciplines.join("  ·  ")
            ),
            mark,
          ]
        ),

        // Middle: the headline
        el(
          "div",
          {
            display: "flex",
            fontFamily: "Serif",
            fontWeight: 600,
            fontSize: titleSize(title),
            lineHeight: 1.14,
            letterSpacing: -1.2,
            color: INK,
            maxWidth: 1000,
          },
          title
        ),

        // Bottom: byline, rule above
        el(
          "div",
          { display: "flex", flexDirection: "column", borderTop: `1px solid ${RULE}`, paddingTop: 26 },
          [
            el(
              "div",
              { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
              [
                el("div", { display: "flex", fontSize: 26, fontWeight: 600, color: INK }, siteConfig.name),
                el("div", { display: "flex", fontSize: 22, color: FAINT }, siteConfig.brand),
              ]
            ),
            el(
              "div",
              { display: "flex", marginTop: 8, fontSize: 22, color: MUTED },
              meta ?? `${siteConfig.role} at ${siteConfig.company}`
            ),
          ]
        ),
      ]
    ) as never,
    { width: WIDTH, height: HEIGHT, fonts: await fonts() }
  );

  return Buffer.from(
    new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render().asPng()
  );
}

/** Response helper so every OG route is one line. */
export async function ogResponse(options: OgOptions): Promise<Response> {
  const png = await renderOgImage(options);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
