import { expect } from '@playwright/test';
import type { ElementHandle, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const list = JSON.parse(
  readFileSync(new URL('../src/data/lists/europa-grz.json', import.meta.url), 'utf8'),
) as { items: { id: string; name: string; category: string }[] };

const NAMES: Record<string, string> = Object.fromEntries(list.items.map((i) => [i.id, i.name]));
const RIVERS = list.items.filter((i) => i.category === 'rivier').map((i) => i.id);
const CATEGORY_LABELS = ['Gebergten', 'Rivieren', 'Zeeën en zeestraten'];

export const nameOf = (id: string) => NAMES[id];

export async function selectOnly(page: Page, label: string) {
  for (const l of CATEGORY_LABELS) {
    const box = page.getByLabel(l, { exact: true });
    if (l === label) await box.check();
    else await box.uncheck();
  }
}

export async function start(page: Page, button: 'Verkennen' | 'Aanwijzen' | 'Benoemen' | 'Oefen mijn fouten') {
  await page.getByRole('button', { name: button, exact: true }).click();
}

/** Click via dispatchEvent; real touch/S-Pen taps are verified manually on the device. */
export async function tap(page: Page, id: string) {
  await page.getByTestId(`hit-${id}`).dispatchEvent('click');
}

/**
 * A client-space point that visibly belongs to the item: inside its (non-land for seas) shape, or on its
 * line, picked as far as possible from every other river line so the test is not about line-on-line overlap.
 */
export async function realPoint(page: Page, id: string): Promise<{ x: number; y: number }> {
  return page.evaluate((id) => {
    const svg = document.querySelector('[data-testid="map-svg"]') as unknown as SVGSVGElement;
    const ctm = svg.getScreenCTM()!;
    const area = document.querySelector('.map-area')!.getBoundingClientRect();
    const land = svg.querySelector('.map-land') as unknown as SVGGeometryElement;
    const g = document.querySelector(`[data-testid="feature-${id}"]`)!;
    const shape = g.querySelector('.shape') as unknown as SVGGeometryElement;
    const isLine = g.getAttribute('data-kind') === 'line';
    const zee = g.getAttribute('data-category') === 'zee';
    const others: { x: number; y: number }[] = [];
    for (const o of document.querySelectorAll('[data-kind="line"]')) {
      if (o === g) continue;
      const sh = o.querySelector('.shape') as unknown as SVGGeometryElement;
      const L = sh.getTotalLength();
      for (let l = 0; l <= L; l += 6) { const p = sh.getPointAtLength(l); others.push({ x: p.x, y: p.y }); }
    }
    const candidates: { x: number; y: number }[] = [];
    if (isLine) {
      const L = shape.getTotalLength();
      for (let l = 0; l <= L; l += 2) { const p = shape.getPointAtLength(l); candidates.push({ x: p.x, y: p.y }); }
    } else {
      const bb = shape.getBBox();
      const step = Math.max(bb.width, bb.height) < 40 ? 0.5 : 5; // slivers like the Strait of Gibraltar
      for (let x = bb.x; x <= bb.x + bb.width; x += step) for (let y = bb.y; y <= bb.y + bb.height; y += step) {
        const pt = new DOMPoint(x, y);
        if (shape.isPointInFill(pt) && !(zee && land.isPointInFill(pt))) candidates.push({ x, y });
      }
      if (candidates.length === 0) candidates.push({ x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 });
    }
    let best: { x: number; y: number; score: number } | null = null;
    const vb = svg.viewBox.baseVal;
    for (const c of candidates) {
      if (c.x < 4 || c.y < 4 || c.x > vb.width - 4 || c.y > vb.height - 4) continue; // inside the drawn map, not the letterbox
      const q = new DOMPoint(c.x, c.y).matrixTransform(ctm);
      if (q.x < area.left + 4 || q.x > area.right - 4 || q.y < area.top + 4 || q.y > area.bottom - 4) continue;
      let d = Infinity;
      for (const o of others) d = Math.min(d, Math.hypot(o.x - c.x, o.y - c.y));
      if (!best || d > best.score) best = { x: q.x, y: q.y, score: d };
    }
    if (!best) throw new Error(`no visible point for ${id}`);
    return { x: best.x, y: best.y };
  }, id);
}

/** Real mouse click at real coordinates (hit-testing included), unlike `tap` which dispatches on the hit element. */
export async function realTap(page: Page, id: string) {
  const { x, y } = await realPoint(page, id);
  await page.mouse.click(x, y);
}

async function currentPrompt(page: Page) {
  const prompt = page.getByTestId('prompt');
  const resultaat = page.getByTestId('resultaat');
  await expect(prompt.or(resultaat)).toBeVisible();
  if (await resultaat.isVisible()) return null;
  const handle = await prompt.elementHandle();
  const id = await prompt.getAttribute('data-item-id');
  return { id: id!, handle: handle! };
}

/** Waits until the given prompt element has been replaced (also when the next item has the same id). */
async function waitReplaced(page: Page, old: ElementHandle) {
  await page.waitForFunction((el) => !el.isConnected, old, { timeout: 10_000 });
}

/** Plays an Aanwijzen round until Resultaat. `wrongOn` = 1-based prompt index on which another river is tapped. */
export async function playPointRound(page: Page, opts: { wrongOn?: number } = {}) {
  let n = 0;
  for (;;) {
    const p = await currentPrompt(page);
    if (!p) return;
    n++;
    if (n === opts.wrongOn) {
      await tap(page, RIVERS.find((r) => r !== p.id)!);
      await page.getByRole('button', { name: 'Verder', exact: true }).click();
    } else {
      await tap(page, p.id);
    }
    await waitReplaced(page, p.handle);
  }
}

/**
 * Plays a Benoemen round until Resultaat. `answer(id, n)` may return a custom answer
 * (typo or wrong); default is the exact name. On a typo, `onAlmost` runs before Verder.
 * On a wrong answer the correct name is typed over.
 */
export async function playNameRound(
  page: Page,
  opts: { answer?: (id: string, n: number) => string | undefined; onAlmost?: () => Promise<void> } = {},
) {
  let n = 0;
  for (;;) {
    const p = await currentPrompt(page);
    if (!p) return;
    n++;
    const input = page.getByLabel('Naam');
    const given = opts.answer?.(p.id, n) ?? NAMES[p.id];
    await input.fill(given);
    await input.press('Enter');
    if (given !== NAMES[p.id]) {
      const verder = page.getByRole('button', { name: 'Verder', exact: true });
      const typeover = page.getByText('Het goede antwoord is:');
      await expect(verder.or(typeover)).toBeVisible();
      if (await verder.isVisible()) {
        await opts.onAlmost?.();
        await verder.click();
      } else {
        await input.fill(NAMES[p.id]);
        await input.press('Enter');
      }
    }
    await waitReplaced(page, p.handle);
  }
}
