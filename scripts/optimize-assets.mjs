// One-off asset optimization: compress covers, favicon, icons, og-image.
// Run from repo root: node scripts/optimize-assets.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pub = path.join(root, "public");

async function exists(p) {
  try { await fs.promises.access(p); return true; } catch { return false; }
}

// 1. Fallback covers -> webp (max width 800, quality 80)
for (let i = 1; i <= 4; i++) {
  const src = path.join(pub, "images", `fallback-cover-${i}.jpg`);
  const out = path.join(pub, "images", `fallback-cover-${i}.webp`);
  if (!(await exists(src))) { console.log("skip (missing):", src); continue; }
  const meta = await sharp(src).metadata();
  await sharp(src)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(out);
  const before = fs.statSync(src).size / 1024;
  const after = fs.statSync(out).size / 1024;
  console.log(`cover-${i}: ${meta.width}x${meta.height} ${before.toFixed(1)}KB -> ${after.toFixed(1)}KB`);
}

// 2. Favicon: optimize 32x32 in place + apple-touch-icon + PWA icons
const logoSrc = path.join(pub, "favicon", "logo.png");
if (await exists(logoSrc)) {
  const meta = await sharp(logoSrc).metadata();
  console.log("logo source:", meta.width, "x", meta.height, (fs.statSync(logoSrc).size / 1024).toFixed(1) + "KB");

  await sharp(logoSrc).resize(32, 32).png({ compressionLevel: 9, palette: true }).toFile(logoSrc + ".tmp");
  fs.renameSync(logoSrc + ".tmp", logoSrc);
  console.log("logo.png -> 32x32", (fs.statSync(logoSrc).size / 1024).toFixed(1) + "KB");

  await sharp(logoSrc).resize(180, 180).png({ compressionLevel: 9 }).toFile(path.join(pub, "favicon", "apple-touch-icon.png"));
  console.log("apple-touch-icon.png -> 180x180", (fs.statSync(path.join(pub, "favicon", "apple-touch-icon.png")).size / 1024).toFixed(1) + "KB");

  // PWA icons: generate 192/512 from the 180px apple icon (flat logo scales fine).
  // Quantised like logo.png above: these are flat-colour logos, and the browser
  // fetches them for the manifest, so 24-bit PNGs cost ~40 kB / ~175 kB of
  // high-priority bytes for no visible gain.
  const pwaSrc = path.join(pub, "favicon", "apple-touch-icon.png");
  for (const size of [192, 512]) {
    await sharp(pwaSrc).resize(size, size).png({ compressionLevel: 9, palette: true }).toFile(path.join(pub, "favicon", `icon-${size}.png`));
    console.log(`icon-${size}.png`, (fs.statSync(path.join(pub, "favicon", `icon-${size}.png`)).size / 1024).toFixed(1) + "KB");
  }
}

// 3. og-image from banner (1200x630 cover)
// Kept as JPEG on purpose: social crawlers (OG / Twitter Card) do not reliably
// accept AVIF, and the meta tags hardcode og:image:width/height as 1200x630.
const bannerSrc = path.join(root, "src", "assets", "images", "banner.avif");
if (await exists(bannerSrc)) {
  await sharp(bannerSrc)
    .resize(1200, 630, { fit: "cover", position: "center" })
    .jpeg({ quality: 82 })
    .toFile(path.join(pub, "og-image.jpg"));
  console.log("og-image.jpg -> 1200x630", (fs.statSync(path.join(pub, "og-image.jpg")).size / 1024).toFixed(1) + "KB");
}

// 4. Remove dead asset hero-image.png (0 references)
const hero = path.join(pub, "hero-image.png");
if (await exists(hero)) {
  fs.unlinkSync(hero);
  console.log("deleted dead asset: public/hero-image.png");
}
console.log("done");
