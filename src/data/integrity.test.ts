import { lists } from './lists';
import { getMap } from './maps';

test('elk item heeft een kaartfeature met pad en labelpunt', () => {
  for (const l of lists) {
    const map = getMap(l.mapId);
    for (const i of l.items) {
      const f = map.features[i.mapFeatureId];
      expect(f, `${l.id}/${i.id}`).toBeDefined(); expect(f.path.length).toBeGreaterThan(10);
      expect(f.labelPoint[0]).toBeGreaterThan(0); expect(f.labelPoint[0]).toBeLessThan(map.width);
      expect(f.labelPoint[1]).toBeGreaterThan(0); expect(f.labelPoint[1]).toBeLessThan(map.height);
    }
  }
});
test('geen dubbele ids of wees-features, per kaart', () => {
  for (const l of lists) {
    const ids = l.items.map(i => i.mapFeatureId);
    expect(new Set(ids).size).toBe(ids.length);
  }
  const mapIds = [...new Set(lists.map(l => l.mapId))];
  for (const mapId of mapIds) {
    const ids = lists.filter(l => l.mapId === mapId).flatMap(l => l.items.map(i => i.mapFeatureId));
    for (const k of Object.keys(getMap(mapId).features)) expect(ids, `${mapId}/${k}`).toContain(k);
  }
});
test('kind van een feature past bij de categorie', () => {
  for (const l of lists) for (const i of l.items) {
    const kind = getMap(l.mapId).features[i.mapFeatureId].kind;
    expect(kind, `${l.id}/${i.id}`).toBe(i.category === 'rivier' ? 'line' : i.category === 'stad' ? 'point' : 'area');
  }
});
test('basislagen zijn gevuld', () => {
  for (const l of lists) expect(getMap(l.mapId).layers.land.length).toBeGreaterThan(100);
});
