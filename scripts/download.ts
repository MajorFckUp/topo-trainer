import { existsSync, mkdirSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CACHE = join(dirname(fileURLToPath(import.meta.url)), '.cache');
export const VECTORS = join(CACHE, 'vectors');
export const RELIEF_DIR = join(CACHE, 'relief');
export const RELIEF_TIF = join(CACHE, 'relief.tif');
const VECTOR_BASE = 'https://raw.' + 'githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
// Verified: HTTP 200 on the Natural Earth S3 bucket (cross-blended hypsometric tints with shaded relief, 50m, public domain).
const RELIEF_ZIP_URL = 'https://naturalearth.s3.amazonaws.com/50m_raster/HYP_50M_SR.zip';

export const VECTOR_FILES = [
  'ne_50m_land', 'ne_50m_admin_0_countries', 'ne_10m_rivers_lake_centerlines', 'ne_10m_rivers_europe',
  'ne_10m_geography_marine_polys', 'ne_10m_lakes', 'ne_10m_geography_regions_polys',
];

export const vectorPath = (name: string) => join(VECTORS, `${name}.geojson`);

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function ensureVectors(): Promise<void> {
  mkdirSync(VECTORS, { recursive: true });
  for (const f of VECTOR_FILES) {
    const p = vectorPath(f);
    if (existsSync(p)) continue;
    console.log(`downloading ${f}`);
    writeFileSync(p, await download(`${VECTOR_BASE}/${f}.geojson`));
  }
}

export async function ensureRelief(): Promise<void> {
  if (existsSync(RELIEF_TIF)) return;
  mkdirSync(RELIEF_DIR, { recursive: true });
  const zip = join(RELIEF_DIR, 'relief.zip');
  console.log('downloading relief raster');
  writeFileSync(zip, await download(RELIEF_ZIP_URL));
  execFileSync('unzip', ['-o', '-q', zip, '-d', RELIEF_DIR]);
  const tif = readdirSync(RELIEF_DIR).find(f => /\.tif$/i.test(f));
  if (!tif) throw new Error('No .tif in relief archive');
  copyFileSync(join(RELIEF_DIR, tif), RELIEF_TIF);
}
