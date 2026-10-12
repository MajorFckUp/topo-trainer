import type { EuropeMap, TopoItem } from '../data/types';

export const fixtureMap: EuropeMap = {
  width: 200,
  height: 140,
  layers: {
    land: 'M20 20H180V120H20Z',
    borders: 'M100 20V120',
    lakes: 'M150 90h10v10h-10Z',
  },
  features: {
    po: { path: 'M40 90C70 80 90 100 120 90', kind: 'line', labelPoint: [80, 85] },
    alpen: { path: 'M60 40L100 30L140 45L100 60Z', kind: 'area', labelPoint: [100, 45] },
    noordzee: { path: 'M0 0H30V15H0Z', kind: 'area', labelPoint: [15, 8] },
  },
};

export const fixtureItems: TopoItem[] = [
  { id: 'po', name: 'Po', category: 'rivier', plus: false, aliases: [], mapFeatureId: 'po' },
  { id: 'alpen', name: 'Alpen', category: 'gebergte', plus: false, aliases: [], mapFeatureId: 'alpen' },
  { id: 'noordzee', name: 'Noordzee', category: 'zee', plus: false, aliases: [], mapFeatureId: 'noordzee' },
];
