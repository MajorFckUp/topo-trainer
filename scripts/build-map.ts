import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoConicConformal, geoPath } from 'd3-geo';
import { fromFile } from 'geotiff';
import sharp from 'sharp';
import { lists } from '../src/data/lists';
import type { TopoMap, MapFeature } from '../src/data/types';
import { SOURCES } from './map-sources';
import { ensureRelief, ensureVectors, RELIEF_TIF, vectorPath } from './download';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

interface MapDef {
  id: string; // matches TopoList.mapId
  json: string;
  relief: string;
  W: number;
  H: number;
  /** [lonMin, latMin, lonMax, latMax] */
  box: [number, number, number, number];
  parallels: [number, number];
  rotate: [number, number];
  landFile: string;
  bordersFile: string;
  /** SVG units; radius of the dot drawn for `point` features */
  pointRadius: number;
}

const MAPS: MapDef[] = [
  {
    id: 'europa', json: 'src/data/maps/europe-map.json', relief: 'public/maps/europe-relief.webp',
    W: 2000, H: 1400, box: [-25, 30, 65, 75], parallels: [35, 60], rotate: [-15, 0],
    landFile: 'ne_50m_land', bordersFile: 'ne_50m_admin_0_countries', pointRadius: 6,
  },
  {
    id: 'centraal-europa', json: 'src/data/maps/centraal-europa-map.json', relief: 'public/maps/centraal-europa-relief.webp',
    W: 1600, H: 1400, box: [-5.5, 41, 17.5, 55.5], parallels: [43, 53], rotate: [-6, 0],
    landFile: 'ne_10m_land', bordersFile: 'ne_10m_admin_0_countries', pointRadius: 7,
  },
];

type Geo = { type: string; coordinates?: unknown; geometries?: unknown };
type Feat = { type: 'Feature'; properties: Record<string, any> | null; geometry: Geo };
const readFc = (p: string): Feat[] => JSON.parse(readFileSync(p, 'utf8')).features;

await ensureVectors();
await ensureRelief();

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
const matchesWhere = (f: Feat, where: Record<string, string>) =>
  Object.entries(where).every(([k, v]) => norm(f.properties?.[k]) === norm(v));

const cache = new Map<string, Feat[]>();
const load = (file: string) => {
  if (!cache.has(file)) cache.set(file, readFc(vectorPath(file)));
  return cache.get(file)!;
};
const overrides = readFc(join(ROOT, 'scripts', 'overrides.geojson'));

const kindOf = (category: string): MapFeature['kind'] =>
  category === 'rivier' ? 'line' : category === 'stad' ? 'point' : 'area';

// Relief raster (RGB hypsometric tints + shading): world equirectangular GeoTIFF, read once and resampled into every conic projection.
const tiff = await fromFile(RELIEF_TIF);
const image = await tiff.getImage();
const sw = image.getWidth();
const sh = image.getHeight();
const bands = (await image.readRasters({ samples: [0, 1, 2] })) as unknown as ArrayLike<number>[];

const only = process.argv.slice(2);
let failed = false;

for (const def of MAPS) {
  if (only.length && !only.includes(def.id)) continue;
  const { W, H } = def;
  const [x0, y0, x1, y1] = def.box;
  const extent: any = { type: 'Polygon', coordinates: [[[x0, y0], [x0, y1], [x1, y1], [x1, y0], [x0, y0]]] };
  const make = () => geoConicConformal().parallels(def.parallels).rotate(def.rotate).fitExtent([[0, 0], [W, H]], extent);
  const projection = make();
  // Paths are clipped slightly outside the viewBox (keeps JSON small, e.g. for the huge Atlantic polygon).
  const clipped = make().clipExtent([[-40, -40], [W + 40, H + 40]]);
  // Label points are computed on geometry clipped to the visible map so they always lie inside it.
  const labelProj = make().clipExtent([[40, 40], [W - 40, H - 40]]);
  const path = geoPath(clipped).digits(1);
  const dotPath = geoPath(clipped).digits(1).pointRadius(def.pointRadius);
  const labelPath = geoPath(labelProj);

  const mapLists = lists.filter(l => l.mapId === def.id);
  const items = mapLists.flatMap(l => l.items);
  const ids = [...new Set(items.map(i => i.mapFeatureId))];
  const features: Record<string, MapFeature> = {};
  const missing: string[] = [];

  for (const id of ids) {
    const src = SOURCES[id];
    const kind = kindOf(items.find(i => i.mapFeatureId === id)!.category);
    if (!src) { missing.push(`${id} (no SOURCES entry)`); continue; }
    if ('point' in src) {
      const at = projection(src.point);
      const d = dotPath({ type: 'Point', coordinates: src.point } as any);
      if (!at || !d) { missing.push(`${id} (point outside projection)`); continue; }
      features[id] = { path: d, kind, labelPoint: [Math.round(at[0] * 10) / 10, Math.round(at[1] * 10) / 10] };
      continue;
    }
    let geoms: Feat[] = [];
    if ('override' in src) geoms = overrides.filter(f => f.properties?.id === id);
    else if ('where' in src) geoms = load(src.file).filter(f => matchesWhere(f, src.where));
    else for (const file of src.files ?? [src.file]) geoms.push(...load(file).filter(f => matches(f, src.names)));
    geoms = geoms.filter(f => f.geometry);
    const d = geoms.length ? path(fc(geoms)) : null;
    if (!d || d.length < 10) { missing.push(id); continue; }
    const c = labelPath.centroid(fc(geoms));
    if (!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) { missing.push(`${id} (no label point)`); continue; }
    features[id] = { path: d, kind, labelPoint: [Math.round(c[0] * 10) / 10, Math.round(c[1] * 10) / 10] };
  }
  if (missing.length) {
    console.error(`[${def.id}] No geometry for: ${missing.join(', ')}`);
    failed = true;
    continue;
  }

  const plain = geoPath(clipped).digits(1);
  const map: TopoMap = {
    width: W,
    height: H,
    layers: {
      land: plain(fc(load(def.landFile))) ?? '',
      borders: plain(fc(load(def.bordersFile))) ?? '',
      lakes: plain(fc(load('ne_10m_lakes'))) ?? '',
    },
    features,
  };
  mkdirSync(dirname(join(ROOT, def.json)), { recursive: true });
  writeFileSync(join(ROOT, def.json), JSON.stringify(map));
  console.log(`${def.json}: ${Object.keys(features).length} features`);

  const buf = Buffer.alloc(W * H * 3, 255);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ll = projection.invert?.([x + 0.5, y + 0.5]);
      if (!ll || !Number.isFinite(ll[0]) || !Number.isFinite(ll[1])) continue;
      const [lon, lat] = ll;
      if (lon < -180 || lon > 180 || lat < -90 || lat > 90) continue;
      const sx = Math.min(sw - 1, Math.max(0, Math.floor(((lon + 180) / 360) * sw)));
      const sy = Math.min(sh - 1, Math.max(0, Math.floor(((90 - lat) / 180) * sh)));
      const o = (y * W + x) * 3;
      const si = sy * sw + sx;
      buf[o] = bands[0][si];
      buf[o + 1] = bands[1][si];
      buf[o + 2] = bands[2][si];
    }
  }
  mkdirSync(dirname(join(ROOT, def.relief)), { recursive: true });
  await sharp(buf, { raw: { width: W, height: H, channels: 3 } })
    .webp({ quality: 80 })
    .toFile(join(ROOT, def.relief));
  console.log(`${def.relief} written`);
}
if (failed) process.exit(1);
