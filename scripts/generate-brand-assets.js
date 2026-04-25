#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const BRAND_DIR = path.join(PUBLIC_DIR, "brand");
const markPath = path.join(BRAND_DIR, "logo-mark.svg");
const wordmarkPath = path.join(BRAND_DIR, "logo-wordmark.svg");

async function ensureSource(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing source asset: ${filePath}`);
  }
}

async function writeIcon(input, size, output) {
  await sharp(input)
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(output);
}

async function main() {
  await ensureSource(markPath);
  await ensureSource(wordmarkPath);

  const markBuffer = fs.readFileSync(markPath);
  const wordmarkBuffer = fs.readFileSync(wordmarkPath);

  await writeIcon(markBuffer, 32, path.join(PUBLIC_DIR, "favicon-32x32.png"));
  await writeIcon(markBuffer, 192, path.join(PUBLIC_DIR, "favicon-192x192.png"));
  await writeIcon(markBuffer, 512, path.join(PUBLIC_DIR, "favicon-512x512.png"));

  await sharp(markBuffer)
    .resize(180, 180, { fit: "contain", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .png()
    .toFile(path.join(PUBLIC_DIR, "apple-touch-icon.png"));

  await sharp(markBuffer)
    .resize(1024, 1024, { fit: "contain", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .png()
    .toFile(path.join(PUBLIC_DIR, "logo.png"));

  await sharp(markBuffer)
    .resize(1024, 1024, { fit: "contain", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(path.join(PUBLIC_DIR, "logo.jpeg"));

  await sharp(wordmarkBuffer)
    .resize({ width: 1400 })
    .png()
    .toFile(path.join(PUBLIC_DIR, "brand", "logo-wordmark.png"));

  const ogBackground = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" rx="40" fill="#F4FBFF"/>
      <circle cx="1020" cy="116" r="180" fill="#D5F0FF"/>
      <circle cx="169" cy="547" r="210" fill="#E2F7D4"/>
      <rect x="68" y="68" width="1064" height="494" rx="36" fill="white"/>
      <rect x="68" y="68" width="1064" height="494" rx="36" stroke="#D8E6F2" stroke-width="2"/>
    </svg>
  `);

  const wordmarkForOg = await sharp(wordmarkBuffer).resize({ width: 760 }).png().toBuffer();

  await sharp(ogBackground)
    .composite([
      { input: wordmarkForOg, top: 88, left: 220 },
      {
        input: Buffer.from(
          `<svg width="760" height="110" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="46" fill="#10204D" font-size="34" font-family="Arial, Helvetica, sans-serif" font-weight="700">
              Buy Data, Airtime and utility services with one clean flow.
            </text>
            <text x="0" y="92" fill="#4D6288" font-size="28" font-family="Arial, Helvetica, sans-serif">
              Affordable, always connected.
            </text>
          </svg>`
        ),
        top: 430,
        left: 220,
      },
    ])
    .png()
    .toFile(path.join(PUBLIC_DIR, "og-image.png"));

  console.log("Generated SY Data brand assets in public/.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
