import { lists, getList } from './index';
import { defaultList } from './index';
test('europa-grz heeft 28 items, 5 plus', () => {
  const l = getList('europa-grz');
  expect(l.items).toHaveLength(28);
  expect(l.items.filter(i => i.plus).map(i => i.id).sort()).toEqual(['apennijnen','karpaten','scandinavisch-hoogland','schotse-hooglanden','vogezen']);
  expect(l.items.filter(i => i.category === 'gebergte')).toHaveLength(10);
  expect(l.items.filter(i => i.category === 'rivier')).toHaveLength(9);
  expect(l.items.filter(i => i.category === 'zee')).toHaveLength(9);
});
test('ids uniek, mapFeatureId gevuld', () => {
  const ids = defaultList.items.map(i => i.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(defaultList.items.every(i => i.mapFeatureId)).toBe(true);
});
test('onbekende lijst gooit', () => { expect(() => getList('x')).toThrow(); expect(lists.length).toBeGreaterThan(0); });

test('centraal-europa heeft 28 items, 5 plus: 9 landen, 16 steden, 3 gebieden', () => {
  const l = getList('centraal-europa');
  expect(l.items).toHaveLength(28);
  expect(l.items.filter(i => i.plus).map(i => i.id).sort()).toEqual(['andorra', 'liechtenstein', 'monaco', 'nice', 'straatsburg']);
  expect(l.items.filter(i => i.category === 'land')).toHaveLength(9);
  expect(l.items.filter(i => i.category === 'stad')).toHaveLength(16);
  expect(l.items.filter(i => i.category === 'gebied')).toHaveLength(3);
  expect(l.mapId).toBe('centraal-europa');
});
test('Luxemburg (land) en (stad) accepteren allebei "Luxemburg"', () => {
  const l = getList('centraal-europa');
  for (const id of ['luxemburg-land', 'luxemburg-stad']) expect(l.items.find(i => i.id === id)!.aliases).toContain('Luxemburg');
});
