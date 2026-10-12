import type { QuizEntry } from '../data/types';

export interface QuizState { queue: QuizEntry[]; mistakes: QuizEntry[]; total: number }
export interface Summary { total: number; correctFirstTry: number; mistakes: QuizEntry[] }
export const REQUEUE_OFFSET = 3;

export function createRound(entries: QuizEntry[], rng: () => number = Math.random): QuizState {
  const queue = [...entries];
  for (let i = queue.length - 1; i >= 1; i--) {
    const j = Math.floor(rng() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return { queue, mistakes: [], total: entries.length };
}

export function current(s: QuizState): QuizEntry | undefined {
  return s.queue[0];
}

export function isDone(s: QuizState): boolean {
  return s.queue.length === 0;
}

export function hasMistake(s: QuizState, e: QuizEntry): boolean {
  return s.mistakes.some(m => m.itemId === e.itemId && m.mode === e.mode);
}

export function resolve(s: QuizState, ok: boolean): QuizState {
  const [head, ...rest] = s.queue;
  if (!head) return s;
  if (ok) return { ...s, queue: rest };
  const mistakes = hasMistake(s, head) ? s.mistakes : [...s.mistakes, head];
  const at = Math.min(REQUEUE_OFFSET, rest.length);
  return { ...s, mistakes, queue: [...rest.slice(0, at), head, ...rest.slice(at)] };
}

export function summarize(s: QuizState): Summary {
  return { total: s.total, correctFirstTry: s.total - s.mistakes.length, mistakes: s.mistakes };
}
