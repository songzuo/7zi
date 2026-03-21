#!/usr/bin/env node

/**
 * PWA Icon Generator
 *
 * Generates all required icon sizes for PWA from the source icon
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const SOURCE_ICON = './public/logo.png';
const OUTPUT_DIR = './public';

const ICONS = [
  // Standard PWA icons
  { size: 72, name: 'icon-72.png' },
  { size: 96, name: 'icon-96.png' },
  { size: 120, name: 'icon-120.png' },
  { size: 128, name: 'icon-128.png' },
  { size: 144, name: 'icon-144.png' },
  { size: 152, name: 'icon-152.png' },
  { size: 180, name: 'icon-180.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 384, name: 'icon-384.png' },
  { size: 512, name: 'icon-512.png' },

  // Favicon sizes
  { size: 16, name: 'icon-16.png' },
  { size: 32, name: 'icon-32.png' },

  // Windows tiles
  { size: 312, name: 'icon-312.png' },
  { size: 310, name: 'icon-310x150.png', width: 310, height: 150 },

  // Maskable icons (for Android)
  { size: 512, name: 'maskable-icon-512.png', maskable: true },

  // Startup screen
  { size: 2048, name: 'apple-touch-startup-image.png', startup: true },

  // Shortcut icons
  { size: 96, name: 'shortcut-projects.png', color: '#06b6d4' },
  { size: 96, name: 'shortcut-agents.png', color: '#8b5cf6' },
  { size: 96, name: 'shortcut-new.png', color: '#10b981' },
];

async function generateIcon(config) {
  const { size, name, width, height, maskable, color, startup } = config;
  const outputPath = path.join(OUTPUT_DIR, name);
  const targetWidth = width || size;
  const targetHeight = height || size;

  console.log(`Generating ${name} (${targetWidth}x${targetHeight})...`);

  try {
    let transformer = sharp(SOURCE_ICON);

    // Resize
    transformer = transformer.resize(targetWidth, targetHeight, {
      fit: 'cover',
      position: 'center',
    });

    // For maskable icons, add padding
    if (maskable) {
      const padding = Math.floor(size * 0.1); // 10% padding
      transformer = transformer.extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: '#06b6d4',
      });
    }

    // For shortcut icons, add colored background
    if (color) {
      transformer = sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: color,
        },
      }).composite([
        {
          input: await transformer.toBuffer(),
          gravity: 'center',
        },
      ]);
    }

    // For startup image, create centered logo with background
    if (startup) {
      const logo = await sharp(SOURCE_ICON)
        .resize(Math.floor(targetWidth * 0.3), Math.floor(targetWidth * 0.3), {
          fit: 'inside',
        })
        .toBuffer();

      transformer = sharp({
        create: {
          width: targetWidth,
          height: targetHeight,
          channels: 4,
          background: '#ffffff',
        },
      }).composite([
        {
          input: logo,
          gravity: 'center',
        },
      ]);
    }

    await transformer.png({ quality: 90 }).toFile(outputPath);
    console.log(`✓ Generated ${name}`);
  } catch (error) {
    console.error(`✗ Failed to generate ${name}:`, error.message);
  }
}

async function generateScreenshots() {
  console.log('\nGenerating screenshot placeholders...');

  // Wide screenshot (desktop)
  try {
    const wide = sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 3,
        background: '#f0f9ff',
      },
    });

    // Add gradient
    const gradient = sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 4,
        background: { r: 6, g: 182, b: 212, alpha: 1 },
      },
    }).composite([
      {
        input: Buffer.from(
          `<svg width="1280" height="720">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#0891b2;stop-opacity:1" />
              </linearGradient>
            </defs>
            <rect width="1280" height="720" fill="url(#grad)"/>
            <text x="640" y="360" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" font-weight="bold">7zi Studio</text>
            <text x="640" y="420" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">AI 驱动的创新数字工作室</text>
          </svg>`
        ),
      },
    ]);

    await gradient.png().toFile(path.join(OUTPUT_DIR, 'screenshot-wide.png'));
    console.log('✓ Generated screenshot-wide.png');
  } catch (error) {
    console.error('✗ Failed to generate screenshot-wide.png:', error.message);
  }

  // Narrow screenshot (mobile)
  try {
    const narrow = sharp({
      create: {
        width: 750,
        height: 1334,
        channels: 4,
        background: { r: 6, g: 182, b: 212, alpha: 1 },
      },
    });

    const gradient = Buffer.from(
      `<svg width="750" height="1334">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0891b2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="750" height="1334" fill="url(#grad)"/>
        <text x="375" y="667" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" font-weight="bold">7zi Studio</text>
      </svg>`
    );

    await sharp(gradient).png().toFile(path.join(OUTPUT_DIR, 'screenshot-narrow.png'));
    console.log('✓ Generated screenshot-narrow.png');
  } catch (error) {
    console.error('✗ Failed to generate screenshot-narrow.png:', error.message);
  }
}

async function main() {
  console.log('🎨 PWA Icon Generator\n');
  console.log(`Source: ${SOURCE_ICON}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // Check if source icon exists
  try {
    await fs.access(SOURCE_ICON);
  } catch {
    console.error(`✗ Source icon not found: ${SOURCE_ICON}`);
    console.error('Please ensure the source icon exists before running this script.');
    process.exit(1);
  }

  // Generate all icons
  console.log('Generating icons...\n');
  for (const icon of ICONS) {
    await generateIcon(icon);
  }

  // Generate screenshots
  await generateScreenshots();

  console.log('\n✨ All icons generated successfully!');
  console.log(`\nGenerated ${ICONS.length} icons and 2 screenshots.`);
}

main().catch(console.error);
