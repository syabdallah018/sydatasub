#!/usr/bin/env node
// This script generates Open Graph images and social sharing assets
// Requires: sharp, canvas libraries
// Install: npm install sharp canvas

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '../public');
const logoPath = path.join(publicDir, 'logo.jpeg');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function generateOGImages() {
  console.log('🎨 Generating Open Graph and social sharing images...');

  try {
    // 1. Main OG Image (1200x630px) - Homepage
    console.log('Creating og-image.png...');
    await sharp(logoPath)
      .resize(300, 300, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .extend({
        top: 165,
        bottom: 165,
        left: 450,
        right: 450,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(publicDir, 'og-image.png'));
    console.log('✅ og-image.png created');

    // 2. OG Image for data plans page (1200x630px)
    console.log('Creating og-image-plans.png...');
    await sharp(logoPath)
      .resize(250, 250, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .extend({
        top: 190,
        bottom: 190,
        left: 475,
        right: 475,
        background: { r: 0, g: 200, b: 150, alpha: 1 }
      })
      .png()
      .toFile(path.join(publicDir, 'og-image-plans.png'));
    console.log('✅ og-image-plans.png created');

    // 3. OG Image for app (1200x630px)
    console.log('Creating og-image-app.png...');
    await sharp(logoPath)
      .resize(280, 280, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .extend({
        top: 175,
        bottom: 175,
        left: 460,
        right: 460,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(publicDir, 'og-image-app.png'));
    console.log('✅ og-image-app.png created');

    // 4. Apple Touch Icon (180x180px)
    console.log('Creating apple-touch-icon.png...');
    await sharp(logoPath)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✅ apple-touch-icon.png created');

    // 5. Favicon in PNG format (32x32px)
    console.log('Creating favicon-32x32.png...');
    await sharp(logoPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(publicDir, 'favicon-32x32.png'));
    console.log('✅ favicon-32x32.png created');

    // 6. Favicon in PNG format (192x192px) for Android
    console.log('Creating favicon-192x192.png...');
    await sharp(logoPath)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(publicDir, 'favicon-192x192.png'));
    console.log('✅ favicon-192x192.png created');

    // 7. Favicon in PNG format (512x512px) for Android
    console.log('Creating favicon-512x512.png...');
    await sharp(logoPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(publicDir, 'favicon-512x512.png'));
    console.log('✅ favicon-512x512.png created');

    console.log('\n✨ All OG images and favicons generated successfully!');
    console.log('📍 Generated files:');
    console.log('  - og-image.png (main Open Graph image)');
    console.log('  - og-image-plans.png (plans page)');
    console.log('  - og-image-app.png (app page)');
    console.log('  - apple-touch-icon.png (iOS)');
    console.log('  - favicon-32x32.png, favicon-192x192.png, favicon-512x512.png (web/Android)');

  } catch (error) {
    console.error('❌ Error generating images:', error);
    process.exit(1);
  }
}

generateOGImages();
