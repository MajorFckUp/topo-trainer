import { lists } from './lists';
import { europeMap } from './maps';
test('elk item heeft een kaartfeature met pad en labelpunt', () => {
  for (const l of lists) for (const i of l.items) {
    const f = europeMap.features[i.mapFeatureId];
    expect(f, `${l.id}/${i.id}`).toBeDefined(); expect(f.path.length).toBeGreaterThan(10);
    expect(f.labelPoint[0]).toBeGreaterThan(0); expect(f.labelPoint[0]).toBeLessThan(europeMap.width);
    expect(f.labelPoint[1]).toBeGreaterThan(0); expect(f.labelPoint[1]).toBeLessThan(europeMap.height);
  }
});
test('geen dubbele ids of wees-features', () => {
  const ids = lists.flatMap(l => l.items.map(i => i.mapFeatureId));
  expect(new Set(ids).size).toBe(ids.length);
  for (const k of Object.keys(europeMap.features)) expect(ids).toContain(k);
});
test('basislagen zijn gevuld', () => { expect(europeMap.layers.land.length).toBeGreaterThan(100); });
