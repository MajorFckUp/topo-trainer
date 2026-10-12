import { expect, test } from 'vitest';
import { LINE_PRIORITY, rankCandidates } from './hit';
import type { HitCandidate } from './hit';

const c = (id: string, kind: 'area' | 'line', contains: boolean, dist: number): HitCandidate => ({ id, kind, contains, dist });

test('een gebied dat het punt bevat gaat voor een rivier die er alleen in de buurt ligt', () => {
  expect(rankCandidates([c('maas', 'line', false, 20), c('ardennen', 'area', true, 0)])).toEqual(['ardennen', 'maas']);
});

test('een rivier vlak onder de vinger wint van het gebied eronder', () => {
  expect(rankCandidates([c('ardennen', 'area', true, 0), c('maas', 'line', false, LINE_PRIORITY - 1)])).toEqual(['maas', 'ardennen']);
});

test('zonder bevattend gebied: dichtstbijzijnde eerst, gelijkspel houdt de volgorde (bovenste eerst)', () => {
  expect(rankCandidates([c('schelde', 'line', false, 25), c('maas', 'line', false, 12), c('rijn', 'line', false, 12)])).toEqual(['maas', 'rijn', 'schelde']);
});

test('lege lijst blijft leeg', () => {
  expect(rankCandidates([])).toEqual([]);
});
