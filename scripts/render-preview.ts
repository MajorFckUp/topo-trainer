import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getMap } from '../src/data/maps';
import { lists } from '../src/data/lists';

const mapId = process.argv[2] ?? 'europa';
const m = getMap(mapId);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'scripts', '.cache');
mkdirSync(OUT, { recursive: true });

const relief = readFileSync(join(ROOT, mapId === 'europa' ? 'public/maps/europe-relief.webp' : `public/maps/${mapId}-relief.webp`)).toString('base64');
const names = new Map(lists.flatMap(l => l.items.map(i => [i.mapFeatureId, i.name] as const)));
const colors = ['#d62728', '#1f77b4', '#2ca02c', '#9467bd', '#ff7f0e', '#17becf', '#8c564b', '#e377c2', '#000000', '#bcbd22'];
let n = 0;
const parts = Object.entries(m.features).map(([id, f]) => {
  const c = colors[n++ % colors.length];
  const shape = f.kind === 'point'
    ? `<path d="${f.path}" fill="${c}" stroke="#fff" stroke-width="2"/>`
    : f.kind === 'area'
    ? `<path d="${f.path}" fill="${c}" fill-opacity="0.35" stroke="${c}" stroke-width="3"/>`
    : `<path d="${f.path}" fill="none" stroke="${c}" stroke-width="5"/>`;
  return `${shape}<text x="${f.labelPoint[0]}" y="${f.labelPoint[1]}" font-size="26" font-family="sans-serif" font-weight="bold" fill="${c}" stroke="#fff" stroke-width="4" paint-order="stroke">${names.get(id)}</text>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${m.width} ${m.height}" width="${m.width}" height="${m.height}">
<rect width="100%" height="100%" fill="#cfe5f2"/>
<path d="${m.layers.land}" fill="#f4efdf"/>
<image width="${m.width}" height="${m.height}" xlink:href="data:image/webp;base64,${relief}"/>
<path d="${m.layers.lakes}" fill="#cfe5f2"/>
<path d="${m.layers.borders}" fill="none" stroke="#888" stroke-width="1"/>
${parts.join('\n')}
</svg>`;
writeFileSync(join(OUT, `preview-${mapId}.svg`), svg);
await sharp(Buffer.from(svg)).resize(1600).png().toFile(join(OUT, `preview-${mapId}.png`));
console.log(`preview-${mapId}.png written`);
