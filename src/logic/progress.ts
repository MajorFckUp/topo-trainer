import type { Mode, Outcome, QuizEntry, TopoItem, TopoList } from '../data/types';

export interface Streaks { aanwijzen: number; benoemen: number }
export interface Progress { version: 1; lists: Record<string, Record<string, Streaks>> }
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const STORAGE_KEY = 'topo-trainer:v1';
export const MASTERY_STREAK = 2;

export function emptyProgress(): Progress {
  return { version: 1, lists: {} };
}

function defaultStorage(): StorageLike | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

function resolve(storage?: StorageLike | null): StorageLike | null {
  return storage === undefined ? defaultStorage() : storage;
}

function cleanStreak(v: unknown): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function loadProgress(storage?: StorageLike | null): Progress {
  try {
    const s = resolve(storage);
    if (!s) return emptyProgress();
    const raw = s.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data.version !== 1 || !isRecord(data.lists)) return emptyProgress();
    const lists: Progress['lists'] = {};
    for (const [listId, items] of Object.entries(data.lists)) {
      if (!isRecord(items)) continue;
      const out: Record<string, Streaks> = {};
      for (const [itemId, st] of Object.entries(items)) {
        const r = isRecord(st) ? st : {};
        out[itemId] = { aanwijzen: cleanStreak(r.aanwijzen), benoemen: cleanStreak(r.benoemen) };
      }
      lists[listId] = out;
    }
    return { version: 1, lists };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: Progress, storage?: StorageLike | null): void {
  try {
    resolve(storage)?.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch { /* silent no-op */ }
}

export function clearProgress(storage?: StorageLike | null): void {
  try {
    resolve(storage)?.removeItem(STORAGE_KEY);
  } catch { /* silent no-op */ }
}

export function streaksOf(p: Progress, listId: string, itemId: string): Streaks {
  const s = p.lists[listId]?.[itemId];
  return { aanwijzen: s?.aanwijzen ?? 0, benoemen: s?.benoemen ?? 0 };
}

export function recordAnswer(p: Progress, listId: string, itemId: string, mode: Mode, outcome: Outcome): Progress {
  const cur = streaksOf(p, listId, itemId);
  const next: Streaks = { ...cur };
  if (outcome === 'clean') next[mode] = cur[mode] + 1;
  else if (outcome === 'miss') next[mode] = 0;
  return { version: 1, lists: { ...p.lists, [listId]: { ...p.lists[listId], [itemId]: next } } };
}

export function isMastered(p: Progress, listId: string, itemId: string): boolean {
  const s = streaksOf(p, listId, itemId);
  return s.aanwijzen >= MASTERY_STREAK && s.benoemen >= MASTERY_STREAK;
}

export function unmasteredItems(p: Progress, list: TopoList, items: TopoItem[] = list.items): TopoItem[] {
  return items.filter(i => !isMastered(p, list.id, i.id));
}

export function weakEntries(p: Progress, list: TopoList, items: TopoItem[]): QuizEntry[] {
  const out: QuizEntry[] = [];
  for (const item of items) {
    const s = streaksOf(p, list.id, item.id);
    if (s.aanwijzen < MASTERY_STREAK) out.push({ itemId: item.id, mode: 'aanwijzen' });
    if (s.benoemen < MASTERY_STREAK) out.push({ itemId: item.id, mode: 'benoemen' });
  }
  return out;
}
