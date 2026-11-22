import europe from './europe-map.json';
import centraalEuropa from './centraal-europa-map.json';
import type { TopoMap } from '../types';

const base: string = import.meta.env?.BASE_URL ?? '/'; // scripts run in plain node, without vite's env

const MAPS: Record<string, TopoMap> = {
  europa: { id: 'europa', reliefUrl: `${base}maps/europe-relief.webp`, ...(europe as unknown as TopoMap) },
  'centraal-europa': { id: 'centraal-europa', reliefUrl: `${base}maps/centraal-europa-relief.webp`, ...(centraalEuropa as unknown as TopoMap) },
};

export function getMap(id: string): TopoMap {
  const m = MAPS[id];
  if (!m) throw new Error(`Unknown map: ${id}`);
  return m;
}

export const europeMap = MAPS.europa;
