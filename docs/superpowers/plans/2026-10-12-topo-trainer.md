# Topo Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Dutch, landscape, touch-first PWA that trains a groep-7 child on the Meander topography list "Gebergten, rivieren en zeeën in Europa" (28 items) through Verkennen, Aanwijzen, Benoemen and "Oefen mijn fouten".

**Architecture:** Vite + React + TS single-page app, no router (screen state in `App.tsx`). Pure, unit-tested logic (`spelling`, `quiz`, `progress`, `selection`) is separate from UI. The map is pre-built offline from Natural Earth by `scripts/build-map.ts` into committed JSON (SVG path strings) plus a relief WebP; `MapView` renders it with per-item tap zones.

**Tech Stack:** Vite, React 18, TypeScript, Vitest + Testing Library, Playwright, vite-plugin-pwa, d3-geo, react-zoom-pan-pinch, tsx, sharp, geotiff.

**Spec:** `docs/superpowers/specs/2026-10-12-topo-trainer-design.md` (read it first; this plan refines it with the decisions in Global Constraints).

## Global Constraints

- Language of all UI text: Dutch. Landscape tablet, large touch targets (min 48 CSS px). Target viewport ≈1334×800 (Galaxy Tab S9 FE).
- 28 items: 10 gebergten, 9 rivieren, 9 zeeën; exactly 5 are `plus` (apennijnen, karpaten, scandinavisch-hoogland, schotse-hooglanden, vogezen). Plus items hidden unless the Plus toggle is on.
- Spelling: case, diacritics, extra whitespace ignored; leading "het"/"de" optional; aliases allowed. Match threshold by target length: ≤3 letters → exact only; 4–7 → distance ≤1; ≥8 → distance ≤2 (Damerau/OSA, adjacent swap = 1).
- **Decision (small typos):** an "almost" answer is *accepted* (no retry, not a round mistake) but the misspelled letters are highlighted (child's input and the correct name side by side) and the child presses "Verder". Wrong answer → show correct name, child types it over once, counts as a mistake.
- Mastery: 2 consecutive **clean** (exact-spelling / first-try tap) answers in BOTH aanwijzen and benoemen. Outcome `miss` resets that mode's streak to 0; outcome `accepted` (typo) leaves the streak unchanged; `clean` increments.
- Progress in localStorage key `topo-trainer:v1`; must survive corrupt/unavailable storage.
- Tapping empty map (no item feature) is ignored. A tap after a pan/pinch (pointer moved >8px) is ignored.
- Spelling input attributes: `autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}`.
- Do not use or commit the Malmberg scans (`Image*.jpeg` are gitignored). Map data is Natural Earth (public domain).
- Wrong items re-queue 3 positions later; round score text: `"24 van 28 goed"`.
- GitHub remote: `https://github.com/MajorFckUp/topo-trainer`; Pages base path `/topo-trainer/` (set via `BASE_PATH` env in CI, default `/`).
- Commit trailer on every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Empty / whitespace-only / punctuation-only Benoemen input → `wrong`, never a crash, never `correct`. (Task 3)
2. Corrupt JSON, wrong-version or unavailable (throwing) localStorage → empty progress, app still works. (Task 5)
3. Pan or pinch ending on a feature must not register as an answer. (Task 7)
4. Zero-item rounds (all categories unchecked; "Oefen mijn fouten" with nothing unmastered) → start disabled / friendly message, never an empty-queue crash. (Tasks 4, 8, 11)
5. Double-tap / double-submit on feedback must not skip the next question or double-record progress. (Tasks 9, 10)

## File Structure

```
package.json, tsconfig.json, vite.config.ts, index.html, eslint.config.js, .prettierrc
playwright.config.ts, e2e/*.spec.ts
scripts/{build-map.ts, map-sources.ts, inspect-sources.ts, overrides.geojson, build-icons.ts}
public/maps/europe-relief.webp, public/icons/*.png
src/main.tsx, src/App.tsx, src/styles.css
src/data/{types.ts, lists/europa-grz.json, lists/index.ts, maps/europe-map.json, maps/index.ts, integrity.test.ts}
src/logic/{spelling.ts, quiz.ts, progress.ts, selection.ts} + *.test.ts
src/map/MapView.tsx (+ .test.tsx)
src/screens/{Home, Verkennen, QuizScreen, PointPrompt, NamePrompt, Resultaat, Voortgang}.tsx (+ tests)
src/test/{setup.ts, fixtureMap.ts}
.github/workflows/deploy.yml
```

Shared types (Task 2, `src/data/types.ts`) — all tasks rely on these exact names:

```ts
export type Category = 'gebergte' | 'rivier' | 'zee';
export type Mode = 'aanwijzen' | 'benoemen';
export type Outcome = 'clean' | 'accepted' | 'miss';
export interface TopoItem { id: string; name: string; category: Category; plus: boolean; aliases: string[]; mapFeatureId: string }
export interface TopoList { id: string; title: string; source: string; items: TopoItem[] }
export interface QuizEntry { itemId: string; mode: Mode }
export interface Settings { categories: Category[]; plus: boolean }
export interface MapFeature { path: string; kind: 'area' | 'line'; labelPoint: [number, number] }
export interface EuropeMap { width: number; height: number; layers: { land: string; borders: string; lakes: string }; features: Record<string, MapFeature> }
```

---

### Task 1: Scaffold

**Files:** Create `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `eslint.config.js`, `.prettierrc`, `playwright.config.ts`, `src/main.tsx`, `src/App.tsx`, `src/App.test.tsx`, `src/styles.css`, `src/test/setup.ts`.

**Interfaces:** Produces npm scripts `dev`, `build`, `preview`, `test` (`vitest run`), `lint`, `e2e` (`playwright test`), `build:map` (`tsx scripts/build-map.ts`).

- [ ] **Step 1:** `package.json` (`"type": "module"`), then `npm i react react-dom react-zoom-pan-pinch d3-geo` and `npm i -D vite @vitejs/plugin-react typescript vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom @types/d3-geo eslint typescript-eslint eslint-plugin-react-hooks prettier @playwright/test tsx sharp geotiff vite-plugin-pwa`. Then `npx playwright install chromium`.
- [ ] **Step 2:** `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: ['src/test/setup.ts'], globals: true, exclude: ['e2e/**', 'node_modules/**'] },
});
```
`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as any).ResizeObserver ??= RO;
```
`tsconfig.json`: strict, `"jsx": "react-jsx"`, `"resolveJsonModule": true`, `"module": "ESNext"`, `"moduleResolution": "Bundler"`, `"target": "ES2022"`, include `src`, `scripts`, `e2e`, `vite.config.ts`.
- [ ] **Step 2b:** `playwright.config.ts`: `testDir: 'e2e'`, `webServer: { command: 'npm run build && npm run preview -- --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true }`, `use: { baseURL: 'http://localhost:4173', viewport: { width: 1334, height: 800 }, hasTouch: true, isMobile: true }`, project `chromium`.
- [ ] **Step 3: Failing test** `src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import App from './App';
test('toont de titel', () => { render(<App />); expect(screen.getByRole('heading', { name: /topo trainer/i })).toBeInTheDocument(); });
```
Run `npx vitest run` → FAIL (no App).
- [ ] **Step 4:** `src/App.tsx` returns `<h1>Topo Trainer</h1>`; `src/main.tsx` mounts it with `import './styles.css'`; `index.html` has `<meta name="viewport" content="width=device-width, initial-scale=1">`, `<html lang="nl">`. `styles.css`: `html,body,#root{height:100%;margin:0}` and `button{min-height:48px;font-size:1.1rem}`.
- [ ] **Step 5:** `npx vitest run` PASS; `npm run lint` and `npx tsc --noEmit` clean; `npm run build` succeeds.
- [ ] **Step 6:** `git add -A && git commit -m "chore: scaffold vite react ts app"` (+ trailer).

---

### Task 2: Data types, list, registry

**Files:** Create `src/data/types.ts` (exact content from "Shared types" above), `src/data/lists/europa-grz.json`, `src/data/lists/index.ts`, `src/data/lists/lists.test.ts`.

**Interfaces:** Produces `lists: TopoList[]`, `getList(id: string): TopoList` (throws on unknown id), `defaultList: TopoList` from `src/data/lists/index.ts`.

- [ ] **Step 1: Failing test** `lists.test.ts`:
```ts
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
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** `europa-grz.json`: `{ "id": "europa-grz", "title": "Gebergten, rivieren en zeeën in Europa", "source": "Meander Topografie groep 7, p. 28–29", "items": [...] }`. Each item `mapFeatureId` equals `id`. Items (id | name | category | plus | aliases):
  - alpen|Alpen|gebergte|no|[]; apennijnen|Apennijnen|gebergte|yes|[]; ardennen|Ardennen|gebergte|no|[]; karpaten|Karpaten|gebergte|yes|[]; kaukasus|Kaukasus|gebergte|no|[]; pyreneeen|Pyreneeën|gebergte|no|["Pyreneen"]; scandinavisch-hoogland|Scandinavisch Hoogland|gebergte|yes|["Scandinavisch Gebergte"]; schotse-hooglanden|Schotse Hooglanden|gebergte|yes|["Schotse Hoogland"]; ural|Ural|gebergte|no|[]; vogezen|Vogezen|gebergte|yes|[]
  - donau|Donau|rivier|no; maas|Maas; po|Po; rhone|Rhône; rijn|Rijn; schelde|Schelde; seine|Seine; theems|Theems; volga|Volga (all `plus:false`, aliases `[]`)
  - atlantische-oceaan|Atlantische Oceaan|zee; kanaal|Het Kanaal|zee|["Kanaal"]; kaspische-zee|Kaspische Zee; middellandse-zee|Middellandse Zee; noordelijke-ijszee|Noordelijke IJszee; noordzee|Noordzee; oostzee|Oostzee; straat-van-gibraltar|Straat van Gibraltar|["Straat Gibraltar"]; zwarte-zee|Zwarte Zee
- [ ] **Step 4:** `index.ts`:
```ts
import europa from './europa-grz.json';
import type { TopoList } from '../types';
export const lists: TopoList[] = [europa as TopoList];
export const defaultList: TopoList = lists[0];
export function getList(id: string): TopoList {
  const l = lists.find(x => x.id === id);
  if (!l) throw new Error(`Unknown list: ${id}`);
  return l;
}
```
- [ ] **Step 5:** Run → PASS. Commit `feat: add topo data types and europa-grz list`.

---

### Task 3: Spelling (with mistake highlighting)

**Files:** Create `src/logic/spelling.ts`, `src/logic/spelling.test.ts`.

**Interfaces:** Consumes `TopoItem`. Produces:
```ts
export type AnswerResult = 'correct' | 'almost' | 'wrong';
export interface Segment { text: string; wrong: boolean }
export function normalize(s: string): string;
export function checkAnswer(input: string, item: TopoItem): AnswerResult;
export function markMistakes(input: string, name: string): { given: Segment[]; correct: Segment[] };
```

- [ ] **Step 1: Failing tests** (`src/logic/spelling.test.ts`):
```ts
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
```
- [ ] **Step 2:** `npx vitest run src/logic/spelling.test.ts` → FAIL.
- [ ] **Step 3: Implement.**
```ts
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
function merge(segs: Segment[]): Segment[] {
  return segs.reduce<Segment[]>((acc, s) => {
    const last = acc[acc.length - 1];
    if (last && last.wrong === s.wrong) last.text += s.text; else acc.push({ ...s });
    return acc;
  }, []);
}
```
Notes for the implementer: fix any failing assertion by correcting the *implementation* unless the test contradicts Global Constraints.
- [ ] **Step 4:** Run → PASS; `npx tsc --noEmit`. Commit `feat: lenient spelling check with mistake highlighting`.

---

### Task 4: Quiz engine + item selection

**Files:** Create `src/logic/quiz.ts`, `src/logic/quiz.test.ts`, `src/logic/selection.ts`, `src/logic/selection.test.ts`.

**Interfaces:** Consumes `QuizEntry`, `Settings`, `TopoItem`, `TopoList`. Produces:
```ts
export interface QuizState { queue: QuizEntry[]; mistakes: QuizEntry[]; total: number }
export interface Summary { total: number; correctFirstTry: number; mistakes: QuizEntry[] }
export const REQUEUE_OFFSET = 3;
export function createRound(entries: QuizEntry[], rng?: () => number): QuizState;
export function current(s: QuizState): QuizEntry | undefined;
export function isDone(s: QuizState): boolean;
export function hasMistake(s: QuizState, e: QuizEntry): boolean;
export function resolve(s: QuizState, ok: boolean): QuizState; // ok=false → mistake + requeue
export function summarize(s: QuizState): Summary;
// selection.ts
export function selectItems(list: TopoList, settings: Settings): TopoItem[];
export const defaultSettings: Settings; // all 3 categories, plus:false
```

- [ ] **Step 1: Failing tests.**
```ts
// quiz.test.ts
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
```
```ts
// selection.test.ts
import { selectItems, defaultSettings } from './selection';
import { defaultList } from '../data/lists';
test('standaard: 23 items (zonder plus)', () => { expect(selectItems(defaultList, defaultSettings)).toHaveLength(23); });
test('plus aan: 28', () => { expect(selectItems(defaultList, { ...defaultSettings, plus: true })).toHaveLength(28); });
test('alleen rivieren', () => { expect(selectItems(defaultList, { categories: ['rivier'], plus: false })).toHaveLength(9); });
test('geen categorieën → leeg', () => { expect(selectItems(defaultList, { categories: [], plus: true })).toEqual([]); });
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** `createRound`: Fisher–Yates over a copy using `rng` (`j = Math.floor(rng() * (i + 1))` for `i` from `n-1` down to 1; with `rng=()=>0.999` this keeps order since `j===i`). `resolve`:
```ts
export function resolve(s: QuizState, ok: boolean): QuizState {
  const [head, ...rest] = s.queue;
  if (!head) return s;
  if (ok) return { ...s, queue: rest };
  const mistakes = hasMistake(s, head) ? s.mistakes : [...s.mistakes, head];
  const at = Math.min(REQUEUE_OFFSET, rest.length);
  return { ...s, mistakes, queue: [...rest.slice(0, at), head, ...rest.slice(at)] };
}
```
`hasMistake` compares `itemId` and `mode`. `summarize` → `{ total: s.total, correctFirstTry: s.total - s.mistakes.length, mistakes: s.mistakes }`. `defaultSettings = { categories: ['gebergte','rivier','zee'], plus: false }`; `selectItems` filters `categories.includes(i.category) && (settings.plus || !i.plus)`.
- [ ] **Step 4:** Run → PASS. Commit `feat: quiz engine and item selection`.

---

### Task 5: Progress

**Files:** Create `src/logic/progress.ts`, `src/logic/progress.test.ts`.

**Interfaces:** Consumes `Mode`, `Outcome`, `TopoItem`, `TopoList`, `QuizEntry`. Produces:
```ts
export interface Streaks { aanwijzen: number; benoemen: number }
export interface Progress { version: 1; lists: Record<string, Record<string, Streaks>> }
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const STORAGE_KEY = 'topo-trainer:v1';
export const MASTERY_STREAK = 2;
export function emptyProgress(): Progress;
export function loadProgress(storage?: StorageLike | null): Progress;
export function saveProgress(p: Progress, storage?: StorageLike | null): void;
export function clearProgress(storage?: StorageLike | null): void;
export function recordAnswer(p: Progress, listId: string, itemId: string, mode: Mode, outcome: Outcome): Progress; // immutable
export function streaksOf(p: Progress, listId: string, itemId: string): Streaks;
export function isMastered(p: Progress, listId: string, itemId: string): boolean;
export function unmasteredItems(p: Progress, list: TopoList, items?: TopoItem[]): TopoItem[];
export function weakEntries(p: Progress, list: TopoList, items: TopoItem[]): QuizEntry[]; // one entry per (item, mode) with streak < MASTERY_STREAK
```

- [ ] **Step 1: Failing tests.**
```ts
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
```
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement: `loadProgress` parses defensively (try/catch; require `version === 1` and object `lists`; keep only streak values that are finite integers ≥0, else 0). Default storage = `try { return globalThis.localStorage ?? null } catch { return null }`; every storage call is wrapped in try/catch. `recordAnswer`: clean → `+1`, miss → `0`, accepted → unchanged. **Step 4:** PASS. Commit `feat: progress tracking with safe storage`.

---

### Task 6: Map build pipeline + integrity test

**Files:** Create `scripts/inspect-sources.ts`, `scripts/map-sources.ts`, `scripts/build-map.ts`, `scripts/overrides.geojson`, `src/data/maps/europe-map.json` (generated), `public/maps/europe-relief.webp` (generated), `src/data/maps/index.ts`, `src/data/integrity.test.ts`. Modify `package.json` scripts (`build:map`, `inspect:map`).

**Interfaces:** Consumes `TopoList`, `EuropeMap`. Produces `export const europeMap: EuropeMap` from `src/data/maps/index.ts`; `europe-map.json` shaped as `EuropeMap` (viewBox `0 0 width height`, default 2000×1400), features keyed by `mapFeatureId`.

- [ ] **Step 1: Failing test** `src/data/integrity.test.ts`:
```ts
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
```
Create `src/data/maps/index.ts`: `import data from './europe-map.json'; export const europeMap = data as EuropeMap;` — the test fails until the JSON exists.
- [ ] **Step 2:** Download inputs into gitignored `scripts/.cache/` (network required). Base URL for vectors: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/<file>.geojson` for `ne_50m_land`, `ne_50m_admin_0_countries`, `ne_10m_rivers_lake_centerlines`, `ne_10m_rivers_europe`, `ne_10m_geography_marine_polys`, `ne_10m_lakes`, `ne_10m_geography_regions_polys`. Relief raster: from `https://www.naturalearthdata.com/downloads/50m-raster-data/50m-shaded-relief/` (**verify the exact archive name**, expected `GRAY_50M_SR_OB` or `GRAY_50M_SR`), unzip the `.tif` to `scripts/.cache/relief.tif`. `build-map.ts` must skip the download when the file exists and use `fetch`; the zip is unzipped with the system `unzip` via `child_process`.
- [ ] **Step 3:** `scripts/inspect-sources.ts`: for each downloaded vector file print `name`, `name_nl`, `name_en` of every feature (or of features whose `name*` contains a search term passed as argv). Run `npm run inspect:map -- Rhone Alps Pyren Caucas Ural Carpath Apenn Scandin Caspian Gibraltar Channel Baltic North Black Mediterr Arctic Atlantic Danube Meuse Thames Volga Rhine Seine Po` and record the real names.
- [ ] **Step 4:** `scripts/map-sources.ts` exports `SOURCES: Record<string, { file: string; names: string[] } | { override: true }>` keyed by `mapFeatureId`. Matching = case-insensitive equality of `name`, `name_nl` or `name_en` against `names`; all matching features are merged. Initial guesses (correct them with Step 3 output): rivers file `ne_10m_rivers_lake_centerlines` (+ `ne_10m_rivers_europe`) names `['Danube','Donau']`, `['Rhine','Rijn']`, `['Rhône','Rhone']`, `['Seine']`, `['Po']`, `['Thames','Theems']`, `['Volga']`, `['Meuse','Maas']`; marine `ne_10m_geography_marine_polys` for atlantische-oceaan (`North Atlantic Ocean`), kanaal (`English Channel`), middellandse-zee (all `Mediterranean Sea*` basins), noordzee (`North Sea`), oostzee (`Baltic Sea`), straat-van-gibraltar (`Strait of Gibraltar`), zwarte-zee (`Black Sea`); `ne_10m_lakes` for kaspische-zee (`Caspian Sea`); `ne_10m_geography_regions_polys` for alpen, apennijnen, karpaten, kaukasus, pyreneeen, scandinavisch-hoogland, ural (e.g. `ALPS`, `APENNINES`, `PYRENEES`, `CAUCASUS MTS`, `URAL MTS`, …). Override (`{ override: true }`): ardennen, vogezen, schotse-hooglanden, schelde, noordelijke-ijszee, plus any item NE lacks. Kind: gebergte/zee → `area`; rivier (and Straat van Gibraltar if drawn as a strait line) → by geometry type.
- [ ] **Step 5:** `scripts/overrides.geojson` — FeatureCollection, each feature `properties: { id }`, lon/lat coordinates; starting shapes (refine by eye vs the book map):
  - ardennen Polygon `[[4.6,49.8],[5.5,50.5],[6.4,50.3],[6.4,49.6],[5.4,49.5],[4.6,49.8]]`
  - vogezen Polygon `[[6.7,47.8],[7.15,47.8],[7.5,48.5],[7.4,49.0],[7.0,48.9],[6.9,48.3],[6.7,47.8]]`
  - schotse-hooglanden Polygon `[[-5.8,56.4],[-4.2,56.5],[-3.3,57.2],[-3.6,57.9],[-4.4,58.4],[-5.3,58.2],[-5.9,57.4],[-5.8,56.4]]`
  - schelde LineString `[[3.3,49.9],[3.2,50.17],[3.5,50.36],[3.4,50.6],[3.72,51.05],[4.1,51.03],[4.4,51.2],[4.35,51.3],[4.0,51.4],[3.55,51.43]]`
  - noordelijke-ijszee Polygon `[[-10,72],[70,72],[70,80],[-10,80],[-10,72]]`
- [ ] **Step 6:** `scripts/build-map.ts`:
  - Projection: `geoConicConformal().parallels([35, 60]).rotate([-15, 0])`, `.fitExtent([[0,0],[2000,1400]], extent)` where `extent` is a GeoJSON polygon lon −25…65, lat 30…75. `const path = geoPath(projection).digits(1)`.
  - `layers.land` = path of `ne_50m_land`; `layers.borders` = path of all `ne_50m_admin_0_countries` features (rendered stroke-only); `layers.lakes` = path of `ne_10m_lakes`.
  - For each `mapFeatureId` of every list in `src/data/lists/index.ts` (import via tsx): collect geometries from `SOURCES` (or override by `properties.id`) → `path(featureCollection)`, `kind`, `labelPoint = path.centroid(...)` (rounded to 1 decimal). **Throw and exit non-zero if any item has no geometry or an empty path.** Write `src/data/maps/europe-map.json` (compact JSON).
  - Relief: read `relief.tif` with `geotiff` (`fromFile` → `getImage()` → `readRasters({ samples: [0] })`, world equirectangular −180…180 / 90…−90). For each output pixel (x,y) of a 2000×1400 buffer: `projection.invert([x,y])` → lon/lat → source pixel (nearest); if `invert` returns null/out of range use 255. Write `public/maps/europe-relief.webp` via `sharp(buf, { raw: { width: 2000, height: 1400, channels: 1 } }).webp({ quality: 80 })`.
- [ ] **Step 7:** `npm run build:map`; then `npx vitest run src/data` → PASS. Create `scripts/preview-map.html`-free check: write a tiny `scripts/render-preview.ts` that emits `scripts/.cache/preview.svg` (land+borders+every feature in a distinct colour, labelled) and open it for the human to compare with the book (p. 29). **Record any features that look misplaced in the commit message and in the final report; do not block on pixel-perfection.**
- [ ] **Step 8:** Commit `feat: natural earth map build pipeline and generated europe map` (the generated JSON and WebP are committed; `scripts/.cache` is ignored). Report the WebP size.

---

### Task 7: MapView

**Files:** Create `src/map/MapView.tsx`, `src/map/MapView.test.tsx`, `src/test/fixtureMap.ts`.

**Interfaces:** Consumes `EuropeMap`, `TopoItem`. Produces:
```ts
export type Highlight = 'target' | 'correct' | 'wrong' | 'wrong-reveal' | 'selected';
export interface MapViewProps {
  map: EuropeMap;
  items: TopoItem[];                          // only these are rendered/tappable
  showLabels?: boolean;
  highlights?: Record<string, Highlight>;     // keyed by item.id
  onItemTap?: (itemId: string) => void;
  reliefUrl?: string;                         // default `${import.meta.env.BASE_URL}maps/europe-relief.webp`
}
export default function MapView(props: MapViewProps): JSX.Element;
```
DOM contract used by later tasks and e2e: each item renders `<g data-testid="feature-{id}" data-highlight="{state|none}">` containing a visible `<path>` and a hit `<path data-testid="hit-{id}">` (transparent stroke width ≥ 24 SVG units for `line` and small `area`; `pointerEvents` on). Labels `<text data-testid="label-{id}">` only when `showLabels`.

- [ ] **Step 1:** `fixtureMap.ts` exports a tiny `fixtureMap: EuropeMap` (200×140; features `po`, `alpen`, `noordzee` with simple paths) and `fixtureItems: TopoItem[]` for those three ids.
- [ ] **Step 2: Failing tests:**
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import MapView from './MapView';
import { fixtureMap, fixtureItems } from '../test/fixtureMap';
const base = { map: fixtureMap, items: fixtureItems };

test('rendert alleen opgegeven items, labels alleen op verzoek', () => {
  const { rerender } = render(<MapView {...base} items={fixtureItems.slice(0, 2)} />);
  expect(screen.getAllByTestId(/^feature-/)).toHaveLength(2); expect(screen.queryByTestId('label-po')).toBeNull();
  rerender(<MapView {...base} showLabels />); expect(screen.getByTestId('label-po')).toHaveTextContent('Po');
});
test('highlight komt in data-highlight', () => {
  render(<MapView {...base} highlights={{ po: 'target' }} />);
  expect(screen.getByTestId('feature-po')).toHaveAttribute('data-highlight', 'target');
  expect(screen.getByTestId('feature-alpen')).toHaveAttribute('data-highlight', 'none');
});
test('tap op hit-zone roept onItemTap', () => {
  const onItemTap = vi.fn(); render(<MapView {...base} onItemTap={onItemTap} />);
  fireEvent.click(screen.getByTestId('hit-po')); expect(onItemTap).toHaveBeenCalledWith('po');
});
test('Review Focus 3: klik na verslepen (>8px) telt niet', () => {
  const onItemTap = vi.fn(); render(<MapView {...base} onItemTap={onItemTap} />);
  fireEvent.pointerDown(screen.getByTestId('map-svg'), { clientX: 0, clientY: 0 });
  fireEvent.click(screen.getByTestId('hit-po'), { clientX: 60, clientY: 40 });
  expect(onItemTap).not.toHaveBeenCalled();
  fireEvent.pointerDown(screen.getByTestId('map-svg'), { clientX: 10, clientY: 10 });
  fireEvent.click(screen.getByTestId('hit-po'), { clientX: 12, clientY: 11 });
  expect(onItemTap).toHaveBeenCalledTimes(1);
});
test('tap zonder onItemTap crasht niet', () => { render(<MapView {...base} />); fireEvent.click(screen.getByTestId('hit-po')); });
```
- [ ] **Step 3:** Run → FAIL. **Step 4: Implement.** Wrap in `react-zoom-pan-pinch` `TransformWrapper` (`minScale 1`, `maxScale 6`, `doubleClick disabled`) → `TransformComponent` with `wrapperStyle={{ width: '100%', height: '100%' }}`; `<svg data-testid="map-svg" viewBox={`0 0 ${map.width} ${map.height}`}>`: `<image href={reliefUrl}>` (full size), land path (`fill` light green-grey, `opacity .6`), lakes, borders (`fill none`, thin grey stroke), then features. Record `pointerDown` coordinates in a ref on the svg (`onPointerDown`); the hit-path `onClick(e)` returns early if `Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8`. Highlight colours in CSS via `[data-highlight=…]` selectors (target orange, correct green, wrong red, wrong-reveal orange+pulse, selected blue). Label font-size scales as ~18 SVG units, `pointer-events: none`.
- [ ] **Step 5:** PASS, `npx tsc --noEmit`, lint. Commit `feat: MapView with tap zones, highlights and pan-safe taps`.

---

### Task 8: App shell, Home, Verkennen

**Files:** Create `src/screens/Home.tsx`, `src/screens/Home.test.tsx`, `src/screens/Verkennen.tsx`, `src/screens/Verkennen.test.tsx`, `src/logic/useProgress.ts`. Modify `src/App.tsx`, `src/App.test.tsx`.

**Interfaces:** Consumes `selectItems`, `weakEntries`, `Settings`, `MapView`, `europeMap`, `defaultList`, `loadProgress`/`saveProgress`. Produces:
```ts
// Home
export type StartKind = 'verkennen' | 'aanwijzen' | 'benoemen' | 'fouten';
export interface HomeProps { list: TopoList; settings: Settings; onSettings: (s: Settings) => void; progress: Progress; onStart: (k: StartKind) => void; onVoortgang: () => void }
// Verkennen
export interface VerkennenProps { list: TopoList; items: TopoItem[]; map: EuropeMap; onBack: () => void }
// useProgress
export function useProgress(): { progress: Progress; record: (listId: string, itemId: string, mode: Mode, outcome: Outcome) => void; reset: () => void }
// App screen state
export type Screen =
  | { name: 'home' } | { name: 'verkennen' } | { name: 'voortgang' }
  | { name: 'quiz'; entries: QuizEntry[] }
  | { name: 'resultaat'; summary: Summary };
```
Home DOM contract: buttons with accessible names `Verkennen`, `Aanwijzen`, `Benoemen`, `Oefen mijn fouten`, `Voortgang`; checkboxes `Gebergten`, `Rivieren`, `Zeeën en zeestraten`, `Plus`.

- [ ] **Step 1: Failing tests (Home):** start buttons disabled when `selectItems` is empty (uncheck all categories) (Review Focus 4); `Oefen mijn fouten` disabled when no weak entries in the selection (`weakEntries(...)` empty) — with fresh progress it is *enabled* (everything is weak); toggling `Plus` calls `onSettings({...settings, plus: true})`; clicking `Aanwijzen` calls `onStart('aanwijzen')`. **Verkennen:** shows map with labels (`label-po` present for selected items), item list grouped by category headings `Gebergten`/`Rivieren`/`Zeeën en zeestraten`; clicking a list entry sets that feature `data-highlight="selected"`; tapping the map feature (`hit-po`) also highlights and shows `Po` in a large caption; `Terug` calls `onBack`. **App:** starts on Home; `Verkennen` navigates and `Terug` returns; settings persist while navigating back.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. `useProgress`: `useState(() => loadProgress())`; `record` computes `recordAnswer` then `saveProgress`; `reset` calls `clearProgress` and sets `emptyProgress()`. `App.tsx` holds `settings` (init `defaultSettings`), `Screen`, `useProgress()`; `onStart('verkennen')` → verkennen; `'aanwijzen'|'benoemen'` → `quiz` with one entry per selected item in that mode; `'fouten'` → `quiz` with `weakEntries(progress, list, items)`. Render stubs for `quiz`/`resultaat`/`voortgang` as `null` until Tasks 9–11 (comment-free; those tasks replace them). Landscape layout via CSS grid; buttons ≥48px.
- [ ] **Step 4:** PASS; commit `feat: app shell, home screen and verkennen`.

---

### Task 9: QuizScreen + PointPrompt (Aanwijzen)

**Files:** Create `src/screens/QuizScreen.tsx`, `src/screens/PointPrompt.tsx`, `src/screens/PointPrompt.test.tsx`, `src/screens/QuizScreen.test.tsx`. Modify `src/App.tsx`.

**Interfaces:** Consumes `createRound/current/resolve/isDone/hasMistake/summarize`, `MapView`, `Outcome`, `Progress` handlers. Produces:
```ts
export interface PromptProps { item: TopoItem; items: TopoItem[]; map: EuropeMap; onDone: (outcome: Outcome) => void }
export default function PointPrompt(p: PromptProps): JSX.Element;      // mode 'aanwijzen'
export interface QuizScreenProps {
  list: TopoList; entries: QuizEntry[]; items: TopoItem[]; map: EuropeMap;
  onRecord: (entry: QuizEntry, outcome: Outcome) => void;
  onFinish: (summary: Summary) => void; onQuit: () => void;
}
export default function QuizScreen(p: QuizScreenProps): JSX.Element;
```
DOM contract: prompt root `<div data-testid="prompt" data-item-id="{id}" data-mode="aanwijzen|benoemen">`; text `Wijs … aan: <b>{name}</b>`; progress text `{done} van {total}`; `Stop` button → `onQuit`.

Behaviour: PointPrompt shows target name; tapping the target feature → `correct` highlight, after 800 ms `onDone('clean')`; tapping another item → highlights tapped `wrong`, target `wrong-reveal`, text `Dat was {tappedName}. Dit is {item.name}.`, `Verder` button → `onDone('miss')`. A `doneRef` ensures only the first tap is processed and `onDone` fires once (Review Focus 5). Timer cleared on unmount. QuizScreen: `useState(() => createRound(entries))`; renders PointPrompt (`key` = entry key + attempt counter) for `mode==='aanwijzen'` (NamePrompt added in Task 10); on `onDone(outcome)`: if `!hasMistake(state, entry)` call `onRecord(entry, outcome)` (re-asks after a mistake are not recorded); then `resolve(state, outcome !== 'miss')`; when `isDone` call `onFinish(summarize(state))`. Empty `entries` → immediately `onFinish` with total 0 via `useEffect`.

- [ ] **Step 1: Failing tests** (use `vi.useFakeTimers()`): correct tap → `feature-x` highlight `correct`, after `vi.advanceTimersByTime(800)` `onDone` called once with `'clean'`; double-tap of correct feature → `onDone` once; wrong tap → `Verder` visible, text contains both names, click → `onDone('miss')` once; QuizScreen: 2-entry round all correct → `onRecord` twice with `'clean'`, `onFinish` with `{ total: 2, correctFirstTry: 2 }`; a miss then correct re-ask → `onRecord` called only once for that entry (`'miss'`), summary has 1 mistake; empty entries → `onFinish` total 0; double `Verder` click doesn't skip.
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS. Wire `quiz`/`resultaat` placeholders in `App.tsx`: quiz renders `QuizScreen` with `items = selectItems(list, settings)` (for practice entries use *all* list items so a mistake whose item is currently hidden by settings still renders), `onRecord={(e,o)=>record(list.id,e.itemId,e.mode,o)}`, `onFinish={s=>setScreen({name:'resultaat',summary:s})}`, `onQuit` → home. Commit `feat: quiz screen with aanwijzen`.

---

### Task 10: NamePrompt (Benoemen)

**Files:** Create `src/screens/NamePrompt.tsx`, `src/screens/NamePrompt.test.tsx`. Modify `src/screens/QuizScreen.tsx`, `src/screens/QuizScreen.test.tsx`.

**Interfaces:** Consumes `checkAnswer`, `markMistakes`, `PromptProps` (Task 9), `MapView`. Produces `export default function NamePrompt(p: PromptProps): JSX.Element` (mode `'benoemen'`).

Behaviour (phases): `input` → child sees map with target highlighted (`target`), text input `aria-label="Naam"` with the required attributes (Global Constraints) and `Controleer` button (Enter submits; submit with empty value does nothing). On submit `checkAnswer`:
- `correct` → highlight `correct`, show `Goed!`, after 800 ms `onDone('clean')`.
- `almost` → **accepted**: show `Bijna goed!`, then panel with two lines (`data-testid="given"` and `data-testid="correct"`) rendering `markMistakes(value, item.name)` segments, wrong segments in `<mark>`; button `Verder` → `onDone('accepted')`.
- `wrong` → show `Het goede antwoord is: {name}`, switch to phase `typeover`: input cleared, label `Typ de naam over`; submitting a value where `checkAnswer !== 'wrong'` (correct or almost) → `onDone('miss')` after a short confirmation; otherwise shake + keep waiting.
`doneRef` guard so `onDone` is called at most once (Review Focus 5); input disabled after answer.

- [ ] **Step 1: Failing tests** (fake timers + `userEvent`): input has `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"`; `Rhone` for rhone → after 800 ms `onDone('clean')`; `Donua` for donau → `<mark>` present in both `given` and `correct`, text `Bijna goed`, `Verder` → `onDone('accepted')` once; `Rijn` for maas → text contains `Maas` and typeover label shown, typing `Maas` + submit → `onDone('miss')`; empty submit does nothing; double submit of correct answer → `onDone` once. QuizScreen test: a `benoemen` entry renders NamePrompt (`data-mode="benoemen"`), an `accepted` outcome is recorded as `'accepted'` and does **not** requeue (not a mistake); `miss` requeues.
- [ ] **Step 2:** FAIL → **Step 3:** implement; extend QuizScreen switch on `entry.mode` → **Step 4:** PASS. Commit `feat: benoemen with lenient spelling and typo highlighting`.

---

### Task 11: Resultaat, Oefen mijn fouten, Voortgang

**Files:** Create `src/screens/Resultaat.tsx`, `src/screens/Resultaat.test.tsx`, `src/screens/Voortgang.tsx`, `src/screens/Voortgang.test.tsx`. Modify `src/App.tsx`, `src/App.test.tsx`.

**Interfaces:** Consumes `Summary`, `QuizEntry`, `Progress`, `isMastered`, `streaksOf`. Produces:
```ts
export interface ResultaatProps { list: TopoList; summary: Summary; onPracticeMistakes: (entries: QuizEntry[]) => void; onHome: () => void }
export interface VoortgangProps { list: TopoList; progress: Progress; onReset: () => void; onBack: () => void }
```
DOM contract: Resultaat shows `{correctFirstTry} van {total} goed` (`data-testid="score"`), a list of mistakes with the correct spelling (`Wijs aan`/`Noem` + name) and, only if mistakes exist, button `Oefen deze fouten`; always `Naar start`. Voortgang lists all 28 items grouped by category with `data-testid="mastered-{id}"` (✓) when `isMastered`, otherwise two dots showing streaks; `Wis voortgang` opens an inline confirm (`Weet je het zeker?` + `Ja, wis alles` / `Annuleer`); only `Ja, wis alles` calls `onReset`.

- [ ] **Step 1: Failing tests:** score text `24 van 28 goed` for `{total:28, correctFirstTry:24, mistakes:[4 entries]}`; mistakes show names; no practice button for `mistakes: []`; practice button passes the exact mistake entries; Voortgang shows ✓ for a mastered item and not for others; reset requires confirm (clicking `Annuleer` doesn't call `onReset`); App-level: **"Oefen mijn fouten" with nothing weak** → Home button disabled (Review Focus 4, already in Task 8) and with all items mastered shows message `Alles geleerd — goed gedaan!` instead of starting an empty round.
- [ ] **Step 2:** FAIL → **Step 3:** implement; in `App.tsx` replace remaining placeholders: `resultaat` renders `Resultaat` (`onPracticeMistakes` → `quiz` with those entries), `voortgang` renders `Voortgang` (`onReset={reset}`). `'fouten'` with zero weak entries stays on Home and shows the message. → **Step 4:** PASS. Commit `feat: results, practice mistakes and progress screens`.

---

### Task 12: PWA + GitHub Pages deploy

**Files:** Create `scripts/build-icons.ts`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`, `.github/workflows/deploy.yml`. Modify `vite.config.ts`, `index.html`, `package.json` (`build:icons`).

**Interfaces:** Consumes env `BASE_PATH`. Produces an installable, offline-capable app; `dist/` deployable to Pages.

- [ ] **Step 1:** `build-icons.ts`: render an inline SVG (green rounded square + white simple mountain/wave glyph) to the three PNGs with `sharp`; run `npm run build:icons`; commit the PNGs.
- [ ] **Step 2:** `vite.config.ts`: add `VitePWA({ registerType: 'autoUpdate', manifest: { name: 'Topo Trainer', short_name: 'Topo', lang: 'nl', display: 'standalone', orientation: 'landscape', start_url: '.', scope: '.', theme_color: '#2e7d32', background_color: '#ffffff', icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }, workbox: { globPatterns: ['**/*.{js,css,html,webp,png,svg,json}'], maximumFileSizeToCacheInBytes: 8 * 1024 * 1024 } })`. Keep `base` from `BASE_PATH`.
- [ ] **Step 3:** `.github/workflows/deploy.yml`: on push to `main` + `workflow_dispatch`; permissions `contents: read, pages: write, id-token: write`; job: `actions/checkout`, `actions/setup-node` (node 22, npm cache), `npm ci`, `npm test`, `BASE_PATH=/${{ github.event.repository.name }}/ npm run build`, `actions/upload-pages-artifact` (`path: dist`), `actions/deploy-pages`.
- [ ] **Step 4:** Verify: `BASE_PATH=/topo-trainer/ npm run build` → `dist/manifest.webmanifest` and `dist/sw.js` exist, icon paths resolve under the base; `npm run build` (default base) also works. `npm test` still green. Commit `feat: installable offline PWA and Pages deploy workflow`.

---

### Task 13: Playwright e2e (tablet viewport)

**Files:** Create `e2e/rondes.spec.ts`, `e2e/helpers.ts`.

**Interfaces:** Consumes the DOM contracts above (`data-testid="prompt"` with `data-item-id`, `hit-{id}`, `score`, `mastered-{id}`, `Plus` checkbox etc.) and `src/data/lists/europa-grz.json` (import for correct names).

- [ ] **Step 1:** `helpers.ts`: `selectOnly(page, 'Rivieren')` (uncheck other category checkboxes), `playPointRound(page, { mistakes: 0 })` (loop: read `[data-testid=prompt]@data-item-id`, `dispatchEvent('click')` on `hit-{id}` — real touch/S-Pen taps are verified manually on the device — wait for next prompt or the score), `playNameRound(page)` (type the item's exact name from the JSON, press Enter).
- [ ] **Step 2: Tests** (viewport comes from `playwright.config.ts`): (a) Verkennen: tap `hit-rijn` highlights it and shows `Rijn`; (b) Aanwijzen with only Rivieren → `9 van 9 goed`; (c) Benoemen with only Rivieren → `9 van 9 goed`; a typo (`Donua`) shows `<mark>` and still counts as correct; (d) mastery: two perfect Aanwijzen + two perfect Benoemen rounds → Voortgang shows `mastered-donau` etc., and after `page.reload()` they are still ✓ (localStorage persisted); (e) a deliberate mistake in Aanwijzen → result lists it and `Oefen deze fouten` starts a 1-item round; (f) `Wis voortgang` → confirm → ✓ gone.
- [ ] **Step 3:** `npx playwright test` PASS (starts build+preview itself). Commit `test: playwright e2e for tablet viewport`.

---

## Final steps (after Task 13)

- [ ] Run `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npx playwright test` — all green.
- [ ] Whole-branch review (fresh reviewer on the most capable model) against the spec and Global Constraints.
- [ ] `git remote add origin https://github.com/MajorFckUp/topo-trainer.git` (if absent) and push **the feature branch only** (`git push -u origin worktree-topo-trainer-build`); never push `main`. Open a draft PR if the remote accepts it.
- [ ] Hand off the manual device checklist from the spec's Verification section (taps and S Pen on thin rivers, pinch-zoom, keyboard doesn't autocorrect, install + offline, Pages deploy) and the list of map features that need a visual check against the book.
