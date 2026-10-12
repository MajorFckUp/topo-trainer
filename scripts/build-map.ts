import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoConicConformal, geoPath } from 'd3-geo';
import { fromFile } from 'geotiff';
import sharp from 'sharp';
import { lists } from '../src/data/lists';
import type { EuropeMap, MapFeature } from '../src/data/types';
import { SOURCES } from './map-sources';
import { ensureRelief, ensureVectors, RELIEF_TIF, vectorPath } from './download';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = 2000;
const H = 1400;

type Geo = { type: string; coordinates?: unknown; geometries?: unknown };
type Feat = { type: 'Feature'; properties: Record<string, any> | null; geometry: Geo };
const readFc = (p: string): Feat[] => JSON.parse(readFileSync(p, 'utf8')).features;

await ensureVectors();
await ensureRelief();

const extent: any = {
  type: 'Polygon',
  coordinates: [[[-25, 30], [-25, 75], [65, 75], [65, 30], [-25, 30]]],
};
const projection = geoConicConformal().parallels([35, 60]).rotate([-15, 0]).fitExtent([[0, 0], [W, H]], extent);
// Paths are clipped slightly outside the viewBox (keeps JSON small, e.g. for the huge Atlantic polygon).
const clipped = geoConicConformal().parallels([35, 60]).rotate([-15, 0]).fitExtent([[0, 0], [W, H]], extent)
  .clipExtent([[-40, -40], [W + 40, H + 40]]);
// Label points are computed on geometry clipped to the visible map so they always lie inside it.
const labelProj = geoConicConformal().parallels([35, 60]).rotate([-15, 0]).fitExtent([[0, 0], [W, H]], extent)
  .clipExtent([[40, 40], [W - 40, H - 40]]);
const path = geoPath(clipped).digits(1);
const labelPath = geoPath(labelProj);

const ringArea = (r: number[][]) => { let a = 0; for (let i = 0, n = r.length - 1; i < n; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return a / 2; };
const orient = (r: number[][], cw: boolean) => ((ringArea(r) < 0) === cw ? r : [...r].reverse());
const rewindPoly = (p: number[][][]) => p.map((r, i) => orient(r, i === 0));
const rewind = (g: any): any => g.type === "Polygon" ? { ...g, coordinates: rewindPoly(g.coordinates) } : g.type === "MultiPolygon" ? { ...g, coordinates: g.coordinates.map(rewindPoly) } : g;
const fc = (features: Feat[]): any => ({ type: "FeatureCollection", features: features.map(f => ({ ...f, geometry: rewind(f.geometry) })) });
const norm = (s: unknown) => String(s ?? '').toLowerCase();
const nameKeys = ['name', 'name_nl', 'name_en', 'NAME', 'NAME_NL', 'NAME_EN'];
const matches = (f: Feat, names: string[]) => {
  const wanted = names.map(norm);
  return nameKeys.some(k => f.properties?.[k] != null && wanted.includes(norm(f.properties[k])));
};

const cache = new Map<string, Feat[]>();
const load = (file: string) => {
  if (!cache.has(file)) cache.set(file, readFc(vectorPath(file)));
  return cache.get(file)!;
};
const overrides = readFc(join(ROOT, 'scripts', 'overrides.geojson'));

const ids = [...new Set(lists.flatMap(l => l.items.map(i => i.mapFeatureId)))];
const features: Record<string, MapFeature> = {};
const missing: string[] = [];
const kindOf = (l: typeof lists[number], id: string): 'area' | 'line' => {
  const item = l.items.find(i => i.mapFeatureId === id)!;
  return item.category === 'rivier' ? 'line' : 'area';
};

for (const id of ids) {
  const src = SOURCES[id];
  let geoms: Feat[] = [];
  if (!src) { missing.push(`${id} (no SOURCES entry)`); continue; }
  if ('override' in src) geoms = overrides.filter(f => f.properties?.id === id);
  else for (const file of src.files ?? [src.file]) geoms.push(...load(file).filter(f => matches(f, src.names)));
  geoms = geoms.filter(f => f.geometry);
  const d = geoms.length ? path(fc(geoms)) : null;
  if (!d || d.length < 10) { missing.push(id); continue; }
  const c = labelPath.centroid(fc(geoms));
  if (!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) { missing.push(`${id} (no label point)`); continue; }
  const list = lists.find(l => l.items.some(i => i.mapFeatureId === id))!;
  features[id] = { path: d, kind: kindOf(list, id), labelPoint: [Math.round(c[0] * 10) / 10, Math.round(c[1] * 10) / 10] };
}
if (missing.length) {
  console.error(`No geometry for: ${missing.join(', ')}`);
  process.exit(1);
}

const plain = geoPath(clipped).digits(1);
const map: EuropeMap = {
  width: W,
  height: H,
  layers: {
    land: plain(fc(load('ne_50m_land'))) ?? '',
    borders: plain(fc(load('ne_50m_admin_0_countries'))) ?? '',
    lakes: plain(fc(load('ne_10m_lakes'))) ?? '',
  },
  features,
};
mkdirSync(join(ROOT, 'src/data/maps'), { recursive: true });
writeFileSync(join(ROOT, 'src/data/maps/europe-map.json'), JSON.stringify(map));
console.log(`europe-map.json: ${Object.keys(features).length} features`);

// Relief raster: world equirectangular GeoTIFF resampled into the conic projection.
const tiff = await fromFile(RELIEF_TIF);
const image = await tiff.getImage();
const sw = image.getWidth();
const sh = image.getHeight();
const rasters = (await image.readRasters({ samples: [0] })) as unknown as ArrayLike<number>[];
const band = rasters[0];
const buf = Buffer.alloc(W * H, 255);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const ll = projection.invert?.([x + 0.5, y + 0.5]);
    if (!ll || !Number.isFinite(ll[0]) || !Number.isFinite(ll[1])) continue;
    const [lon, lat] = ll;
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) continue;
    const sx = Math.min(sw - 1, Math.max(0, Math.floor(((lon + 180) / 360) * sw)));
    const sy = Math.min(sh - 1, Math.max(0, Math.floor(((90 - lat) / 180) * sh)));
    buf[y * W + x] = band[sy * sw + sx];
  }
}
mkdirSync(join(ROOT, 'public/maps'), { recursive: true });
await sharp(buf, { raw: { width: W, height: H, channels: 1 } })
  .webp({ quality: 80 })
  .toFile(join(ROOT, 'public/maps/europe-relief.webp'));
console.log('europe-relief.webp written');
