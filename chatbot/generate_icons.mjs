/**
 * Icon generator — creates all PWA icon PNGs from the favicon SVG
 * Run: node generate_icons.mjs
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// The SVG source (Mydeen AI gradient bolt icon)
const SVG_CONTENT = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 48 46">
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#bg-grad)" transform="scale(10.667)"/>
  <g transform="translate(4, 3) scale(0.833)">
    <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
  </g>
</svg>`;

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const outDir = path.join('public', 'icons');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Write a temporary SVG
const tmpSvg = path.join(outDir, 'source.svg');
fs.writeFileSync(tmpSvg, SVG_CONTENT);

console.log('✅ SVG source written to', tmpSvg);
console.log('📦 Icons directory:', outDir);
console.log('');
console.log('To convert SVGs to PNGs, install sharp or use an online converter.');
console.log('For now, copying SVG as fallback for each size...');

// Copy SVG as named files (browsers can use SVG icons)
SIZES.forEach(size => {
  const dest = path.join(outDir, `icon-${size}.png`);
  // We'll create a proper sized SVG wrapper
  const sizedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 46">
  <rect width="48" height="46" rx="10" fill="#0a0a0a"/>
  <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
</svg>`;
  fs.writeFileSync(path.join(outDir, `icon-${size}.svg`), sizedSvg);
  console.log(`  ✓ icon-${size}.svg`);
});
console.log('\nDone! Note: For production, convert SVGs to PNGs using sharp.');
