#!/usr/bin/env node
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Use absolute path
const PUBLIC_DIR = 'C:\\Users\\HP\\Desktop\\DESKTOP\\public';
const LOGO_PATH = path.join(PUBLIC_DIR, 'logo.jpeg');

async function generateFavicons() {
  try {
    if (!fs.existsSync(LOGO_PATH)) {
      console.error(`❌ Logo file not found: ${LOGO_PATH}`);
      process.exit(1);
    }

    console.log('🎨 Generating favicon assets from logo.jpeg...\n');

    // Favicon 32x32
    await sharp(LOGO_PATH)
      .resize(32, 32, { fit: 'cover', position: 'center' })
      .png()
      .toFile(path.join(PUBLIC_DIR, 'favicon-32x32.png'));
    console.log('✓ Generated: favicon-32x32.png');

    // Favicon 192x192
    await sharp(LOGO_PATH)
      .resize(192, 192, { fit: 'cover', position: 'center' })
      .png()
      .toFile(path.join(PUBLIC_DIR, 'favicon-192x192.png'));
    console.log('✓ Generated: favicon-192x192.png');

    // Favicon 512x512
    await sharp(LOGO_PATH)
      .resize(512, 512, { fit: 'cover', position: 'center' })
      .png()
      .toFile(path.join(PUBLIC_DIR, 'favicon-512x512.png'));
    console.log('✓ Generated: favicon-512x512.png');

    // Apple touch icon 180x180
    await sharp(LOGO_PATH)
      .resize(180, 180, { fit: 'cover', position: 'center' })
      .png()
      .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
    console.log('✓ Generated: apple-touch-icon.png');

    // OG Image 1200x630 (with background)
    const canvas = sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 3,
        background: { r: 6, g: 182, b: 212 }
      }
    });

    // Create OG image with logo in center
    const logoBuffer = await sharp(LOGO_PATH)
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .png()
      .toBuffer();

    await canvas
      .composite([
        {
          input: logoBuffer,
          left: 400,
          top: 115,
          blend: 'over'
        }
      ])
      .png()
      .toFile(path.join(PUBLIC_DIR, 'og-image.png'));
    console.log('✓ Generated: og-image.png (1200x630)');

    console.log('\n✨ All favicon assets generated successfully!');
    console.log('📁 Location: public/ directory');
  } catch (error) {
    console.error('❌ Error generating favicons:', error.message);
    process.exit(1);
  }
}

generateFavicons();
