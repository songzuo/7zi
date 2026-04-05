# PWA Icons

This directory contains PWA icons for the 7zi-frontend application.

## Required Icons

The following icons are required for PWA support:

- `icon-72x72.png` - 72x72 pixels
- `icon-96x96.png` - 96x96 pixels
- `icon-128x128.png` - 128x128 pixels
- `icon-144x144.png` - 144x144 pixels
- `icon-152x152.png` - 152x152 pixels
- `icon-192x192.png` - 192x192 pixels
- `icon-384x384.png` - 384x384 pixels
- `icon-512x512.png` - 512x512 pixels

## Generating Icons

To generate icons from a source image, use the following script:

```bash
npm run generate-icons
```

Or manually using ImageMagick:

```bash
convert source.png -resize 72x72 icon-72x72.png
convert source.png -resize 96x96 icon-96x96.png
convert source.png -resize 128x128 icon-128x128.png
convert source.png -resize 144x144 icon-144x144.png
convert source.png -resize 152x152 icon-152x152.png
convert source.png -resize 192x192 icon-192x192.png
convert source.png -resize 384x384 icon-384x384.png
convert source.png -resize 512x512 icon-512x512.png
```

## Icon Design Guidelines

- Use a simple, recognizable logo
- Ensure good contrast on both light and dark backgrounds
- Include padding (at least 10% of the icon size)
- Test on both light and dark backgrounds
- Consider the "maskable" property for adaptive icons

## Placeholder Icons

For development purposes, placeholder icons can be generated using the script:

```bash
node scripts/generate-placeholder-icons.js
```

This will create simple colored squares with the "7zi" text.