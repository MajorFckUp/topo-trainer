import type { TopoItem } from '../data/types';

export type AnswerResult = 'correct' | 'almost' | 'wrong';
export interface Segment { text: string; wrong: boolean }

const foldChar = (c: string) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}
const stripArticle = (s: string) => s.replace(/^(het|de) /, '');

function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const cost = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
const maxDistance = (len: number) => (len <= 3 ? 0 : len <= 7 ? 1 : 2);

export function checkAnswer(input: string, item: TopoItem): AnswerResult {
  const given = stripArticle(normalize(input));
  if (!given) return 'wrong';
  const candidates = [item.name, ...item.aliases].map(n => stripArticle(normalize(n)));
  if (candidates.includes(given)) return 'correct';
  return candidates.some(c => distance(given, c) <= maxDistance(c.length)) ? 'almost' : 'wrong';
}

function splitArticle(s: string): [string, string] {
  const m = /^((?:het|de) )(.*)$/i.exec(s.trim());
  return m ? [m[1], m[2]] : ['', s.trim()];
}

function toSegments(chars: string[], wrong: boolean[]): Segment[] {
  const out: Segment[] = [];
  chars.forEach((c, i) => {
    const last = out[out.length - 1];
    if (last && last.wrong === wrong[i]) last.text += c; else out.push({ text: c, wrong: wrong[i] });
  });
  return out;
}

function merge(segs: Segment[]): Segment[] {
  return segs.reduce<Segment[]>((acc, s) => {
    const last = acc[acc.length - 1];
    if (last && last.wrong === s.wrong) last.text += s.text; else acc.push({ ...s });
    return acc;
  }, []);
}

export function markMistakes(input: string, name: string): { given: Segment[]; correct: Segment[] } {
  const [gArt, g] = splitArticle(input.replace(/\s+/g, ' '));
  const [cArt, c] = splitArticle(name);
  const a = [...g], b = [...c];
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (foldChar(a[i - 1]) === foldChar(b[j - 1]) ? 0 : 1));
  const gw = a.map(() => true), cw = b.map(() => true);
  let i = a.length, j = b.length;
  while (i > 0 && j > 0) {
    const same = foldChar(a[i - 1]) === foldChar(b[j - 1]);
    if (d[i][j] === d[i - 1][j - 1] + (same ? 0 : 1)) { if (same) { gw[i - 1] = false; cw[j - 1] = false; } i--; j--; }
    else if (d[i][j] === d[i - 1][j] + 1) i--; else j--;
  }
  const given = [...(gArt ? toSegments([...gArt], [...gArt].map(() => false)) : []), ...toSegments(a, gw)];
  const correct = [...(cArt ? toSegments([...cArt], [...cArt].map(() => false)) : []), ...toSegments(b, cw)];
  return { given: merge(given), correct: merge(correct) };
}
