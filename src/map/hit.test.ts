import { expect, test } from 'vitest';
import { LINE_PRIORITY, POINT_PRIORITY, rankCandidates } from './hit';
import type { HitCandidate } from './hit';

const c = (id: string, kind: 'area' | 'line' | 'point', contains: boolean, dist: number): HitCandidate => ({ id, kind, contains, dist });

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

test('een stad vlak onder de vinger wint van het land en het gebied eronder', () => {
  expect(rankCandidates([c('belgie', 'area', true, 0), c('vlaanderen', 'area', true, 0), c('brussel', 'point', true, 0)]))
    .toEqual(['brussel', 'belgie', 'vlaanderen']);
});

test('een stad die net binnen POINT_PRIORITY ligt wint, een stad daarbuiten niet', () => {
  expect(rankCandidates([c('luxemburg-land', 'area', true, 0), c('luxemburg-stad', 'point', false, POINT_PRIORITY)])[0]).toBe('luxemburg-stad');
  expect(rankCandidates([c('luxemburg-land', 'area', true, 0), c('luxemburg-stad', 'point', false, POINT_PRIORITY + 1)])[0]).toBe('luxemburg-land');
});

test('twee steden vlak bij elkaar: de dichtstbijzijnde eerst', () => {
  expect(rankCandidates([c('antwerpen', 'point', false, 10), c('brussel', 'point', false, 4)])).toEqual(['brussel', 'antwerpen']);
});
