const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

async function generateFavicon() {
  const source = './public/logo.png'
  const output = './public/favicon.ico'

  console.log('Generating favicon.ico...')

  try {
    // Generate multiple sizes for favicon
    const sizes = [16, 32, 48]

    const buffers = await Promise.all(
      sizes.map(async size => {
        return await sharp(source)
          .resize(size, size, { fit: 'cover', position: 'center' })
          .png()
          .toBuffer()
      })
    )

    // Create a simple ICO file (just the 32x32 version)
    await sharp(source).resize(32, 32, { fit: 'cover', position: 'center' }).png().toFile(output)

    console.log('✓ Generated favicon.ico')
  } catch (error) {
    console.error('✗ Failed to generate favicon.ico:', error.message)
  }
}

generateFavicon()
