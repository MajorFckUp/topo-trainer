import { createRound, current, resolve, isDone, summarize, hasMistake } from './quiz';
const e = (n: string) => ({ itemId: n, mode: 'benoemen' as const });
const seq = (...ns: string[]) => ns.map(e);
const noShuffle = () => 0.999; // keeps order with the Fisher-Yates below

test('createRound bewaart alle entries (shuffle)', () => {
  const s = createRound(seq('a','b','c','d'));
  expect(s.queue.map(x => x.itemId).sort()).toEqual(['a','b','c','d']); expect(s.total).toBe(4);
});
test('goed → verdwijnt uit queue, klaar als leeg', () => {
  let s = createRound(seq('a','b'), noShuffle);
  expect(current(s)?.itemId).toBe('a'); s = resolve(s, true); s = resolve(s, true);
  expect(isDone(s)).toBe(true); expect(summarize(s)).toEqual({ total: 2, correctFirstTry: 2, mistakes: [] });
});
test('fout → 3 plekken later opnieuw, telt als fout', () => {
  let s = createRound(seq('a','b','c','d','e'), noShuffle);
  s = resolve(s, false);
  expect(s.queue.map(x => x.itemId)).toEqual(['b','c','d','a','e']);
  expect(hasMistake(s, e('a'))).toBe(true);
});
test('fout bij korte queue komt achteraan', () => {
  let s = createRound(seq('a','b'), noShuffle); s = resolve(s, false);
  expect(s.queue.map(x => x.itemId)).toEqual(['b','a']);
});
test('herkansing goed → geen eerste-keer-goed', () => {
  let s = createRound(seq('a'), noShuffle); s = resolve(s, false); s = resolve(s, true);
  expect(isDone(s)).toBe(true); expect(summarize(s)).toEqual({ total: 1, correctFirstTry: 0, mistakes: [e('a')] });
});
test('dubbele fout wordt één keer vermeld', () => {
  let s = createRound(seq('a'), noShuffle); s = resolve(s, false); s = resolve(s, false);
  expect(s.mistakes).toHaveLength(1);
});
test('Review Focus 4: lege ronde is meteen klaar, resolve is no-op', () => {
  const s = createRound([]); expect(isDone(s)).toBe(true); expect(resolve(s, true)).toEqual(s); expect(summarize(s).total).toBe(0);
});
