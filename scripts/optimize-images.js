#!/usr/bin/env node

/**
 * Image Optimization Script
 * Converts PNG/JPG images to WebP format for better performance
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const PUBLIC_DIR = path.join(__dirname, '..', 'public')

// Check if cwebp is available
let hasCwebp = false
try {
  execSync('which cwebp', { stdio: 'ignore' })
  hasCwebp = true
  console.log('✓ cwebp found, will convert images to WebP')
} catch (e) {
  console.log('⚠ cwebp not found. Install with: apt-get install webp')
}

// Image files to optimize
const images = ['logo.png', 'icon-512.png', 'apple-touch-icon.png', 'icon-192.png']

console.log('\n🖼️  Image Optimization Report\n')
console.log('='.repeat(60))

images.forEach(filename => {
  const filePath = path.join(PUBLIC_DIR, filename)

  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${filename} - Not found`)
    return
  }

  const stats = fs.statSync(filePath)
  const sizeKB = (stats.size / 1024).toFixed(2)
  console.log(`\n📄 ${filename}`)
  console.log(`   Size: ${sizeKB} KB`)

  if (hasCwebp) {
    const webpPath = filePath.replace(/\.(png|jpg|jpeg)$/i, '.webp')

    if (!fs.existsSync(webpPath)) {
      try {
        console.log(`   🔄 Converting to WebP...`)
        execSync(`cwebp -q 80 "${filePath}" -o "${webpPath}"`, { stdio: 'ignore' })

        const webpStats = fs.statSync(webpPath)
        const webpSizeKB = (webpStats.size / 1024).toFixed(2)
        const savings = ((1 - webpStats.size / stats.size) * 100).toFixed(1)

        console.log(`   ✓ ${path.basename(webpPath)}`)
        console.log(`   Size: ${webpSizeKB} KB (${savings}% smaller)`)
      } catch (e) {
        console.log(`   ❌ Conversion failed`)
      }
    } else {
      const webpStats = fs.statSync(webpPath)
      const webpSizeKB = (webpStats.size / 1024).toFixed(2)
      const savings = ((1 - webpStats.size / stats.size) * 100).toFixed(1)
      console.log(`   ✓ WebP version exists`)
      console.log(`   Size: ${webpSizeKB} KB (${savings}% smaller)`)
    }
  }
})

console.log('\n' + '='.repeat(60))
console.log('\n💡 Recommendation: Use <picture> element with WebP fallback:')
console.log('<picture>')
console.log('  <source srcSet="/logo.webp" type="image/webp" />')
console.log('  <img src="/logo.png" alt="Logo" />')
console.log('</picture>')
