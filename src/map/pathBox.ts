const ARGS: Record<string, number> = { m: 2, l: 2, t: 2, h: 1, v: 1, c: 6, s: 4, q: 4, z: 0 };

/**
 * Width/height (SVG units) of a path's control-point box. Handles M L H V C S Q T Z in both cases
 * (arcs are not used by the generated map). Slight over-estimate for curves is fine: it is only used
 * to decide whether a feature is too small to see.
 */
export function pathBox(d: string): { w: number; h: number } {
  let x = 0, y = 0, sx = 0, sy = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = (px: number, py: number) => {
    minX = Math.min(minX, px); maxX = Math.max(maxX, px);
    minY = Math.min(minY, py); maxY = Math.max(maxY, py);
  };
  for (const [, cmd, body] of d.matchAll(/([a-zA-Z])([^a-zA-Z]*)/g)) {
    const lower = cmd.toLowerCase();
    const rel = cmd === lower;
    const nums = (body.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    if (lower === 'z') { x = sx; y = sy; continue; }
    const n = ARGS[lower];
    if (!n) continue;
    for (let i = 0; i + n <= nums.length; i += n) {
      const a = nums.slice(i, i + n);
      if (lower === 'h') x = rel ? x + a[0] : a[0];
      else if (lower === 'v') y = rel ? y + a[0] : a[0];
      else {
        for (let k = 0; k < n - 2; k += 2) add(rel ? x + a[k] : a[k], rel ? y + a[k + 1] : a[k + 1]);
        x = rel ? x + a[n - 2] : a[n - 2];
        y = rel ? y + a[n - 1] : a[n - 1];
        if (lower === 'm') { sx = x; sy = y; }
      }
      add(x, y);
    }
  }
  return minX === Infinity ? { w: 0, h: 0 } : { w: maxX - minX, h: maxY - minY };
}
