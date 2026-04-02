const sharp = require('sharp')
const fs = require('fs')

const path = require('path')

const files = [
  [path.join(__dirname, 'public/logo.png'), path.join(__dirname, 'public/logo.webp')],
  [path.join(__dirname, 'public/icon-512.png'), path.join(__dirname, 'public/icon-512.webp')],
  [
    path.join(__dirname, 'public/apple-touch-icon.png'),
    path.join(__dirname, 'public/apple-touch-icon.webp'),
  ],
  [
    path.join(__dirname, 'public/apple-touch-startup-image.png'),
    path.join(__dirname, 'public/apple-touch-startup-image.webp'),
  ],
  [
    path.join(__dirname, 'public/screenshot-narrow.png'),
    path.join(__dirname, 'public/screenshot-narrow.webp'),
  ],
  [
    path.join(__dirname, 'public/screenshot-wide.png'),
    path.join(__dirname, 'public/screenshot-wide.webp'),
  ],
]

async function convertFiles() {
  const results = []

  for (const [src, dst] of files) {
    try {
      await sharp(src).webp({ quality: 85 }).toFile(dst)
      const srcSize = fs.statSync(src).size
      const dstSize = fs.statSync(dst).size
      const savings = ((1 - dstSize / srcSize) * 100).toFixed(1)
      results.push({
        file: src,
        srcSize: (srcSize / 1024).toFixed(2) + 'KB',
        dstSize: (dstSize / 1024).toFixed(2) + 'KB',
        savings: savings + '%',
      })
      console.log(`✓ ${src} → ${dst} (saved ${savings}%)`)
    } catch (e) {
      console.error(`✗ Error converting ${src}:`, e.message)
      results.push({ file: src, error: e.message })
    }
  }

  console.log('\n=== Image Optimization Summary ===')
  console.table(results)
}

convertFiles()
  .then(() => console.log('\n✅ All conversions complete!'))
  .catch(e => console.error('Fatal error:', e))
