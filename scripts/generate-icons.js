/**
 * Generate PNG icons from SVG for PWA
 * Run with: node scripts/generate-icons.js
 *
 * Note: This script requires the 'sharp' package.
 * If not installed, run: npm install sharp --save-dev
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Create icons directory if it doesn't exist
const iconsDir = join(rootDir, 'public', 'icons');
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
  console.log('Created icons directory');
}

// Create screenshots directory if it doesn't exist
const screenshotsDir = join(rootDir, 'public', 'screenshots');
if (!existsSync(screenshotsDir)) {
  mkdirSync(screenshotsDir, { recursive: true });
  console.log('Created screenshots directory');
}

async function generateIcons() {
  try {
    // Try to import sharp
    const sharp = (await import('sharp')).default;

    const svgPath = join(rootDir, 'public', 'favicon.svg');
    const svgBuffer = readFileSync(svgPath);

    const sizes = [
      { name: 'icon-192.png', size: 192 },
      { name: 'icon-512.png', size: 512 },
      { name: 'apple-touch-icon.png', size: 180 },
      { name: 'maskable-512.png', size: 512 }, // Add padding for maskable
    ];

    for (const { name, size } of sizes) {
      const outputPath = join(iconsDir, name);

      if (name === 'maskable-512.png') {
        // Maskable icons need padding (safe zone is 80% of the icon)
        const padding = Math.floor(size * 0.1);
        const innerSize = size - (padding * 2);

        await sharp(svgBuffer)
          .resize(innerSize, innerSize)
          .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 99, g: 102, b: 241, alpha: 1 } // Primary color
          })
          .png()
          .toFile(outputPath);
      } else {
        await sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toFile(outputPath);
      }

      console.log(`Generated ${name}`);
    }

    console.log('All icons generated successfully!');
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.log('Sharp not installed. Creating placeholder icons using canvas fallback...');
      createPlaceholderIcons();
    } else {
      console.error('Error generating icons:', error);
      createPlaceholderIcons();
    }
  }
}

function createPlaceholderIcons() {
  // Create a simple HTML file that can be opened in browser to generate icons
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Generate PWA Icons</title>
  <style>
    body { font-family: system-ui; padding: 20px; }
    canvas { display: block; margin: 10px 0; border: 1px solid #ccc; }
    button { margin: 5px; padding: 10px 20px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>PWA Icon Generator</h1>
  <p>Click each button to download the icon:</p>

  <div id="icons"></div>

  <script>
    const sizes = [
      { name: 'icon-192.png', size: 192 },
      { name: 'icon-512.png', size: 512 },
      { name: 'apple-touch-icon.png', size: 180 },
      { name: 'maskable-512.png', size: 512, maskable: true },
    ];

    const container = document.getElementById('icons');

    sizes.forEach(({ name, size, maskable }) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, size * 0.15);
      ctx.fill();

      const padding = maskable ? size * 0.1 : 0;
      const innerSize = size - padding * 2;
      const scale = innerSize / 100;

      ctx.save();
      ctx.translate(padding, padding);
      ctx.scale(scale, scale);

      // QR code pattern
      ctx.fillStyle = 'white';
      ctx.fillRect(15, 15, 20, 20);
      ctx.fillRect(65, 15, 20, 20);
      ctx.fillRect(15, 65, 20, 20);

      // Inner squares
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(20, 20, 10, 10);
      ctx.fillRect(70, 20, 10, 10);
      ctx.fillRect(20, 70, 10, 10);

      // Center target
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(50, 50, 12, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(50, 50, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      const div = document.createElement('div');
      div.innerHTML = '<h3>' + name + ' (' + size + 'x' + size + ')</h3>';
      div.appendChild(canvas);

      const btn = document.createElement('button');
      btn.textContent = 'Download ' + name;
      btn.onclick = () => {
        const link = document.createElement('a');
        link.download = name;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      div.appendChild(btn);

      container.appendChild(div);
    });
  </script>
</body>
</html>`;

  const htmlPath = join(iconsDir, 'generate.html');
  writeFileSync(htmlPath, htmlContent);
  console.log(`
Created icon generator HTML at: public/icons/generate.html

To generate icons:
1. Open the HTML file in a browser
2. Click each "Download" button
3. Save the files to public/icons/
4. Delete the generate.html file

Or install sharp for automatic generation:
  npm install sharp --save-dev
  node scripts/generate-icons.js
`);
}

generateIcons();
