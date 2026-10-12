import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const GREEN = '#2e7d32';

// Glyph drawn in a 512x512 viewBox: two white mountain peaks plus a wave line.
const glyph = `
  <path d="M96 340 L212 168 L280 262 L328 200 L416 340 Z" fill="#ffffff"/>
  <path d="M96 384 q40 -28 80 0 t80 0 t80 0 t80 0" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round"/>
`;

function svg(maskable: boolean): string {
  // Maskable: full-bleed background, glyph scaled into the central ~60% safe zone.
  const bg = maskable
    ? `<rect width="512" height="512" fill="${GREEN}"/>`
    : `<rect width="512" height="512" rx="96" fill="${GREEN}"/>`;
  const scale = maskable ? 0.6 : 0.9;
  const offset = (512 - 512 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${bg}
  <g transform="translate(${offset} ${offset}) scale(${scale})">${glyph}</g>
</svg>`;
}

async function render(name: string, size: number, maskable: boolean): Promise<void> {
  await sharp(Buffer.from(svg(maskable))).resize(size, size).png().toFile(`public/icons/${name}`);
  console.log(`wrote public/icons/${name}`);
}

mkdirSync('public/icons', { recursive: true });
await render('icon-192.png', 192, false);
await render('icon-512.png', 512, false);
await render('icon-maskable-512.png', 512, true);
