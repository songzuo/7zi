/**
 * Generate Placeholder PWA Icons
 *
 * This script generates placeholder icons for development purposes.
 * For production, replace with proper designed icons.
 */

const fs = require('fs')
const path = require('path')

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const ICONS_DIR = path.join(__dirname, '../public/icons')
const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe']

/**
 * Generate a simple SVG icon with text
 */
function generateIconSVG(size, color) {
  const padding = Math.floor(size * 0.1)
  const contentSize = size - padding * 2

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.15}"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-weight="bold" font-size="${contentSize * 0.5}"
        fill="white">7zi</text>
</svg>`
}

/**
 * Create icon file
 */
function createIcon(size, color, index) {
  const filename = `icon-${size}x${size}.png`
  const filepath = path.join(ICONS_DIR, filename)

  console.log(`Generating ${filename}...`)

  // For now, generate SVG files (can be converted to PNG later)
  const svgContent = generateIconSVG(size, color)
  const svgFilename = `icon-${size}x${size}.svg`
  const svgFilepath = path.join(ICONS_DIR, svgFilename)

  fs.writeFileSync(svgFilepath, svgContent)

  console.log(`✅ Created ${svgFilename}`)
}

/**
 * Generate all icons
 */
function generateIcons() {
  console.log('🎨 Generating PWA icons...\n')

  // Ensure icons directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true })
  }

  // Generate each icon size with a color
  ICON_SIZES.forEach((size, index) => {
    const color = COLORS[index % COLORS.length]
    createIcon(size, color, index)
  })

  // Generate a favicon.ico placeholder
  const faviconSVG = generateIconSVG(32, '#667eea')
  fs.writeFileSync(path.join(ICONS_DIR, 'favicon.svg'), faviconSVG)
  console.log('✅ Created favicon.svg')

  console.log('\n✨ All icons generated successfully!')
  console.log('\n⚠️  Note: These are SVG placeholder icons for development.')
  console.log('   For production, convert them to PNG or design proper icons.')
}

// Run generation
generateIcons()
