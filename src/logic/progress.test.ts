import { emptyProgress, recordAnswer, isMastered, streaksOf, loadProgress, saveProgress, clearProgress, weakEntries, unmasteredItems, STORAGE_KEY } from './progress';
import { defaultList } from '../data/lists';
const L = 'europa-grz';
const mem = () => { const m = new Map<string,string>(); return { getItem: (k:string)=>m.get(k)??null, setItem:(k:string,v:string)=>void m.set(k,v), removeItem:(k:string)=>void m.delete(k), m }; };

test('clean verhoogt, miss reset, accepted laat staan', () => {
  let p = recordAnswer(emptyProgress(), L, 'po', 'benoemen', 'clean');
  p = recordAnswer(p, L, 'po', 'benoemen', 'accepted'); expect(streaksOf(p, L, 'po').benoemen).toBe(1);
  p = recordAnswer(p, L, 'po', 'benoemen', 'miss'); expect(streaksOf(p, L, 'po').benoemen).toBe(0);
});
test('mastered: 2x clean in beide modes', () => {
  let p = emptyProgress();
  for (const m of ['aanwijzen','benoemen'] as const) { p = recordAnswer(p, L, 'po', m, 'clean'); expect(isMastered(p, L, 'po')).toBe(false); p = recordAnswer(p, L, 'po', m, 'clean'); }
  expect(isMastered(p, L, 'po')).toBe(true);
});
test('recordAnswer muteert niet', () => { const p = emptyProgress(); recordAnswer(p, L, 'po', 'aanwijzen', 'clean'); expect(p).toEqual(emptyProgress()); });
test('roundtrip opslaan/laden en wissen', () => {
  const s = mem(); const p = recordAnswer(emptyProgress(), L, 'po', 'aanwijzen', 'clean');
  saveProgress(p, s); expect(loadProgress(s)).toEqual(p); clearProgress(s); expect(loadProgress(s)).toEqual(emptyProgress());
});
test('Review Focus 2: corrupt / verkeerde versie / storage gooit', () => {
  const s = mem(); s.setItem(STORAGE_KEY, '{nope'); expect(loadProgress(s)).toEqual(emptyProgress());
  s.setItem(STORAGE_KEY, JSON.stringify({ version: 99, lists: {} })); expect(loadProgress(s)).toEqual(emptyProgress());
  s.setItem(STORAGE_KEY, JSON.stringify({ version: 1, lists: { [L]: { po: { aanwijzen: 'x', benoemen: -4 } } } }));
  expect(streaksOf(loadProgress(s), L, 'po')).toEqual({ aanwijzen: 0, benoemen: 0 });
  const bad = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => { throw new Error('denied'); } };
  expect(loadProgress(bad)).toEqual(emptyProgress()); expect(() => saveProgress(emptyProgress(), bad)).not.toThrow(); expect(loadProgress(null)).toEqual(emptyProgress());
});
test('weakEntries en unmasteredItems', () => {
  const items = defaultList.items.filter(i => i.category === 'rivier');
  expect(weakEntries(emptyProgress(), defaultList, items)).toHaveLength(18);
  let p = emptyProgress(); for (const m of ['aanwijzen','benoemen'] as const) { p = recordAnswer(p, L, 'po', m, 'clean'); p = recordAnswer(p, L, 'po', m, 'clean'); }
  expect(unmasteredItems(p, defaultList, items)).toHaveLength(8); expect(weakEntries(p, defaultList, items)).toHaveLength(16);
});
