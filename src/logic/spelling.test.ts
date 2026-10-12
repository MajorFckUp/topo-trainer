import { checkAnswer, normalize, markMistakes } from './spelling';
import { getList } from '../data/lists';
const item = (id: string) => getList('europa-grz').items.find(i => i.id === id)!;

test('normalize strips accents/case/space', () => { expect(normalize('  RHÔNE  ')).toBe('rhone'); expect(normalize('Straat  van   Gibraltar')).toBe('straat van gibraltar'); });

test.each([
  ['rhone','rhone'],['RHÔNE','rhone'],['pyreneen','pyreneeen'],['kanaal','kanaal'],
  ['het kanaal','kanaal'],['noordelijke ijszee','noordelijke-ijszee'],['de maas','maas'],
])('correct: %s', (input, id) => { expect(checkAnswer(input, item(id))).toBe('correct'); });

test('almost: transpositie en 1 letter', () => {
  expect(checkAnswer('Donua', item('donau'))).toBe('almost');
  expect(checkAnswer('Scheld', item('schelde'))).toBe('almost');
  expect(checkAnswer('Karpaaten', item('karpaten'))).toBe('almost');
});
test('wrong: andere naam of te ver weg', () => {
  expect(checkAnswer('Rijn', item('maas'))).toBe('wrong');
  expect(checkAnswer('Pi', item('po'))).toBe('wrong'); // ≤3 letters: exact only
});
test('Review Focus 1: leeg/whitespace/leestekens is wrong', () => {
  for (const s of ['', '   ', '...', '-', ' , ']) expect(checkAnswer(s, item('po'))).toBe('wrong');
});
test('markMistakes markeert ontbrekende en foute letters', () => {
  const r = markMistakes('Donua', 'Donau');
  expect(r.correct.filter(s => s.wrong).map(s => s.text).join('')).not.toBe('');
  expect(r.correct.map(s => s.text).join('')).toBe('Donau');
  expect(r.given.map(s => s.text).join('')).toBe('Donua');
});
test('markMistakes: geen fouten → niets gemarkeerd; weggelaten lidwoord ok', () => {
  expect(markMistakes('Rijn', 'Rijn').correct.every(s => !s.wrong)).toBe(true);
  const r = markMistakes('kanal', 'Het Kanaal');
  expect(r.correct.map(s => s.text).join('')).toBe('Het Kanaal');
  expect(r.correct.find(s => s.text === 'Het' || s.text.startsWith('Het'))?.wrong).toBeFalsy();
  expect(r.correct.some(s => s.wrong)).toBe(true);
});
