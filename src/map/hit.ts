export interface HitCandidate {
  id: string;
  kind: 'area' | 'line';
  /** the visible geometry actually contains the tap point (areas only) */
  contains: boolean;
  /** distance in SVG units from the tap point to the visible outline/line */
  dist: number;
}

/** A line closer than this (SVG units, ~ its visible width) to the finger beats an area underneath it. */
export const LINE_PRIORITY = 6;

/**
 * Ranks every hit element under the finger, best first. `candidates` must be in DOM top-to-bottom
 * order (as `elementsFromPoint` returns them); ties keep that order.
 * 1. a line right under the finger, 2. an area that really contains the point, 3. the rest by distance.
 */
export function rankCandidates(candidates: HitCandidate[]): string[] {
  const tier = (c: HitCandidate) =>
    c.kind === 'line' && c.dist <= LINE_PRIORITY ? 0 : c.kind === 'area' && c.contains ? 1 : 2;
  return candidates
    .map((c, i) => ({ c, i }))
    .sort((a, b) => tier(a.c) - tier(b.c) || (tier(a.c) === 1 ? 0 : a.c.dist - b.c.dist) || a.i - b.i)
    .map(({ c }) => c.id);
}

const SAMPLE_STEP = 2;

/** Distance from an SVG point to the outline of a geometry element (sampled; only used on a tap). */
export function distanceToPath(shape: SVGGeometryElement, x: number, y: number): number {
  if (typeof shape.getTotalLength !== 'function') return Infinity;
  const total = shape.getTotalLength();
  let best = Infinity;
  for (let l = 0; ; l += SAMPLE_STEP) {
    const p = shape.getPointAtLength(Math.min(l, total));
    best = Math.min(best, Math.hypot(p.x - x, p.y - y));
    if (l >= total) break;
  }
  return best;
}
