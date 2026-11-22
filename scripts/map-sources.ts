// Real Natural Earth names found with `npm run inspect:map` (see task-6 report).
// Matching: case-insensitive equality of name / name_nl / name_en (any property-key casing).
export type Source =
  | { file: string; names: string[]; files?: string[] }
  | { file: string; where: Record<string, string> }
  | { point: [number, number] }
  | { override: true };

const RIVERS = 'ne_10m_rivers_lake_centerlines';
const RIVERS_EU = 'ne_10m_rivers_europe';
const MARINE = 'ne_10m_geography_marine_polys';
const REGIONS = 'ne_10m_geography_regions_polys';
const COUNTRIES = 'ne_10m_admin_0_countries';
const PROVINCES = 'ne_10m_admin_1_states_provinces';

export const SOURCES: Record<string, Source> = {
  // rivers (rivers_lake_centerlines has Schelde and Maas, so no override needed)
  donau: { file: RIVERS, names: ['Danube', 'Donau'] },
  rijn: { file: RIVERS, names: ['Rhine', 'Rhin', 'Rijn', 'Nederrijn'] },
  rhone: { file: RIVERS, names: ['Rhône', 'Rhone'] },
  seine: { file: RIVERS, names: ['Seine'] },
  po: { file: RIVERS, names: ['Po'] },
  theems: { file: RIVERS, names: ['Thames', 'Theems'] },
  volga: { file: RIVERS, names: ['Volga', 'Wolga'], files: [RIVERS, RIVERS_EU] },
  maas: { file: RIVERS, names: ['Maas', 'Meuse'] },
  schelde: { file: RIVERS, names: ['Schelde', 'Scheldt', 'Escaut'] },
  // seas
  'atlantische-oceaan': { file: MARINE, names: ['North Atlantic Ocean'] },
  kanaal: { file: MARINE, names: ['English Channel'] },
  'middellandse-zee': { file: MARINE, names: ['Mediterranean Sea', 'Adriatic Sea', 'Tyrrhenian Sea', 'Ionian Sea', 'Aegean Sea', 'Ligurian Sea', 'Balearic Sea', 'Alboran Sea', 'Sea of Crete'] },
  noordzee: { file: MARINE, names: ['North Sea'] },
  oostzee: { file: MARINE, names: ['Baltic Sea'] },
  'straat-van-gibraltar': { file: MARINE, names: ['Strait of Gibraltar'] },
  'zwarte-zee': { file: MARINE, names: ['Black Sea'] },
  'kaspische-zee': { file: MARINE, names: ['Caspian Sea'] }, // in marine polys; not in ne_10m_lakes
  // mountains
  alpen: { file: REGIONS, names: ['ALPS'] },
  apennijnen: { file: REGIONS, names: ['APPENNINI'] },
  karpaten: { file: REGIONS, names: ['CARPATHIAN MOUNTAINS'] },
  kaukasus: { file: REGIONS, names: ['CAUCASUS MTS.'] },
  pyreneeen: { file: REGIONS, names: ['PYRENEES'] },
  'scandinavisch-hoogland': { file: REGIONS, names: ['KJØLEN MOUNTAINS'] },
  ural: { file: REGIONS, names: ['URAL MOUNTAINS'] },
  // no usable NE geometry: hand-drawn in overrides.geojson
  ardennen: { override: true },
  vogezen: { override: true },
  'schotse-hooglanden': { override: true },
  'noordelijke-ijszee': { override: true },

  // Centraal-Europa: countries (10m borders so the micro-states are visible)
  andorra: { file: COUNTRIES, names: ['Andorra'] },
  belgie: { file: COUNTRIES, names: ['Belgium'] },
  duitsland: { file: COUNTRIES, names: ['Germany'] },
  frankrijk: { file: COUNTRIES, names: ['France'] },
  liechtenstein: { file: COUNTRIES, names: ['Liechtenstein'] },
  'luxemburg-land': { file: COUNTRIES, names: ['Luxembourg'] },
  monaco: { file: COUNTRIES, names: ['Monaco'] },
  oostenrijk: { file: COUNTRIES, names: ['Austria'] },
  zwitserland: { file: COUNTRIES, names: ['Switzerland'] },
  // regions: Belgian provinces dissolved by language region; Ruhrgebied is hand-drawn
  vlaanderen: { file: PROVINCES, where: { admin: 'Belgium', region: 'Flemish' } },
  wallonie: { file: PROVINCES, where: { admin: 'Belgium', region: 'Walloon' } },
  ruhrgebied: { override: true },
  // cities as [lon, lat]
  antwerpen: { point: [4.40, 51.22] },
  berlijn: { point: [13.40, 52.52] },
  bern: { point: [7.45, 46.95] },
  bordeaux: { point: [-0.58, 44.84] },
  brussel: { point: [4.35, 50.85] },
  geneve: { point: [6.14, 46.20] },
  hamburg: { point: [9.99, 53.55] },
  keulen: { point: [6.96, 50.94] },
  'luxemburg-stad': { point: [6.13, 49.61] },
  lyon: { point: [4.84, 45.76] },
  marseille: { point: [5.37, 43.30] },
  munchen: { point: [11.58, 48.14] },
  nice: { point: [7.26, 43.70] },
  parijs: { point: [2.35, 48.86] },
  straatsburg: { point: [7.75, 48.58] },
  wenen: { point: [16.37, 48.21] },
};
