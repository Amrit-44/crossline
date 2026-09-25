/**
 * Generates web-ready brand assets from `public/crossline-logo.png`
 * (the primary logo — never edited by hand).
 *
 *   node scripts/generate-assets.mjs
 *
 * Outputs (all committed):
 * - public/apple-touch-icon.png  (180×180)
 * - public/icon-192.png / public/icon-512.png (PWA/manifest)
 * - public/og.png (1200×630 social preview: paper, logo, title, tagline)
 * - public/crossline-logo-512.png (lightweight header/footer variant)
 *
 * Requires the `sharp` package (already a transitive dependency).
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
const logo = path.join(pub, "crossline-logo.png");

const PAPER = "#f6f1e3";
const INK = "#2e2118";
const ACCENT = "#c23a22";
const SOFT = "#6b5a48";

const ogText = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="${PAPER}"/>
  <rect x="28" y="28" width="1144" height="574" rx="26" fill="none" stroke="${INK}" stroke-width="6"/>
  <text x="470" y="275" font-family="Georgia, 'Times New Roman', serif" font-size="132" font-weight="900" letter-spacing="2" fill="${INK}">CROSS<tspan fill="${ACCENT}">LINE</tspan></text>
  <path d="M472 305 Q 640 294, 810 302 T 1090 300" fill="none" stroke="${ACCENT}" stroke-width="7" stroke-linecap="round"/>
  <text x="472" y="368" font-family="Georgia, serif" font-style="italic" font-size="44" fill="${SOFT}">Three pieces. One line. Outsmart your rival.</text>
  <text x="472" y="500" font-family="Georgia, serif" font-size="36" fill="${SOFT}">3×3 duel · vs bot · local · online</text>
  <path d="M472 528 Q 600 520, 730 524" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
</svg>`;

const jobs = [
  sharp(logo).resize(180, 180, { fit: "cover" }).png().toFile(path.join(pub, "apple-touch-icon.png")),
  sharp(logo).resize(192, 192, { fit: "cover" }).png().toFile(path.join(pub, "icon-192.png")),
  sharp(logo).resize(512, 512, { fit: "cover" }).png().toFile(path.join(pub, "icon-512.png")),
  sharp(logo).resize(512, 512, { fit: "inside", withoutEnlargement: true }).png().toFile(path.join(pub, "crossline-logo-512.png")),
  (async () => {
    const mark = await sharp(logo).resize(300, 300, { fit: "cover" }).png().toBuffer();
    await sharp({ create: { width: 1200, height: 630, channels: 3, background: PAPER } })
      .composite([
        { input: Buffer.from(ogText), top: 0, left: 0 },
        { input: mark, top: 165, left: 110 },
      ])
      .png()
      .toFile(path.join(pub, "og.png"));
  })(),
];

await Promise.all(jobs);
console.log("[assets] apple-touch-icon.png, icon-192.png, icon-512.png, og.png, crossline-logo-512.png written");
