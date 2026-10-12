// Real Natural Earth names found with `npm run inspect:map` (see task-6 report).
// Matching: case-insensitive equality of name / name_nl / name_en (any property-key casing).
export type Source = { file: string; names: string[]; files?: string[] } | { override: true };

const RIVERS = 'ne_10m_rivers_lake_centerlines';
const RIVERS_EU = 'ne_10m_rivers_europe';
const MARINE = 'ne_10m_geography_marine_polys';
const REGIONS = 'ne_10m_geography_regions_polys';

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
};
