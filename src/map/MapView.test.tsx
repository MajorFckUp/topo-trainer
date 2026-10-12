import { render, screen, fireEvent } from '@testing-library/react';
import MapView from './MapView';
import { orderItems } from './order';
import { pathBox } from './pathBox';
import { fixtureMap, fixtureItems } from '../test/fixtureMap';
import type { TopoItem } from '../data/types';
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
  fireEvent.click(screen.getByTestId('hit-po')); expect(onItemTap).toHaveBeenCalledWith('po', ['po']);
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

test('alleen zee-items krijgen een clip-path naar niet-land', () => {
  render(<MapView {...base} />);
  const clip = screen.getByTestId('feature-noordzee').getAttribute('clip-path');
  expect(clip).toMatch(/^url\(#[A-Za-z0-9_-]+\)$/);
  expect(screen.getByTestId('feature-po')).not.toHaveAttribute('clip-path');
  expect(screen.getByTestId('feature-alpen')).not.toHaveAttribute('clip-path');
  const id = clip!.slice(5, -1);
  const path = document.getElementById(id)!.querySelector('path')!;
  expect(path).toHaveAttribute('clip-rule', 'evenodd');
  expect(path.getAttribute('d')).toBe(`M0 0H200V140H0Z${fixtureMap.layers.land}`);
});

test('hit-zones: brede transparante streek; lijnen smaller dan gebieden zodat ze buurrivieren niet afdekken', () => {
  render(<MapView {...base} />);
  for (const it of fixtureItems) {
    const hit = screen.getByTestId(`hit-${it.id}`);
    expect(hit).toHaveAttribute('stroke', 'transparent');
    const w = Number(hit.getAttribute('stroke-width'));
    if (it.category === 'rivier') { expect(w).toBeGreaterThanOrEqual(24); expect(w).toBeLessThanOrEqual(36); }
    else expect(w).toBeGreaterThanOrEqual(48);
  }
});

test('tap geeft alle hit-zones onder de vinger door (bovenste eerst) als kandidaten', () => {
  const onItemTap = vi.fn(); render(<MapView {...base} onItemTap={onItemTap} />);
  const spy = vi.fn(() => [screen.getByTestId('hit-po'), document.body, screen.getByTestId('hit-alpen')]);
  (document as unknown as { elementsFromPoint: unknown }).elementsFromPoint = spy;
  try {
    fireEvent.click(screen.getByTestId('hit-po'), { clientX: 5, clientY: 6 });
  } finally {
    delete (document as unknown as { elementsFromPoint?: unknown }).elementsFromPoint;
  }
  expect(spy).toHaveBeenCalledWith(5, 6);
  expect(onItemTap).toHaveBeenCalledWith('po', ['po', 'alpen']);
});

test('orderItems: zee, gebergte, rivier; grotere paden eerst', () => {
  const mk = (id: string, category: TopoItem['category']): TopoItem => ({ id, name: id, category, plus: false, aliases: [], mapFeatureId: id });
  const items = [mk('r', 'rivier'), mk('zsmall', 'zee'), mk('g', 'gebergte'), mk('zbig', 'zee')];
  const f = (path: string, kind: 'area' | 'line') => ({ path, kind, labelPoint: [0, 0] as [number, number] });
  const features = { r: f('M0 0', 'line'), g: f('M0 0', 'area'), zsmall: f('M0 0', 'area'), zbig: f('M0 0L1 1L2 2L3 3', 'area') };
  expect(orderItems(items, features).map((i) => i.id)).toEqual(['zbig', 'zsmall', 'g', 'r']);
});

test('terugkeren naar het startpunt na verslepen telt niet als tap', () => {
  const onItemTap = vi.fn(); render(<MapView {...base} onItemTap={onItemTap} />);
  const svg = screen.getByTestId('map-svg');
  fireEvent.pointerDown(svg, { clientX: 10, clientY: 10 });
  fireEvent.pointerMove(svg, { clientX: 60, clientY: 40 });
  fireEvent.pointerMove(svg, { clientX: 11, clientY: 10 });
  fireEvent.click(screen.getByTestId('hit-po'), { clientX: 11, clientY: 10 });
  expect(onItemTap).not.toHaveBeenCalled();
});

test('svg vult de container (content- en wrapperstijl 100%)', () => {
  const { container } = render(<MapView {...base} />);
  const content = container.querySelector('.react-transform-component') as HTMLElement;
  const wrapper = container.querySelector('.react-transform-wrapper') as HTMLElement;
  expect(content.style.width).toBe('100%'); expect(content.style.height).toBe('100%');
  expect(wrapper.style.width).toBe('100%'); expect(wrapper.style.height).toBe('100%');
});

test('relief is geclipt op land', () => {
  const { container } = render(<MapView {...base} />);
  const clip = container.querySelector('image')!.getAttribute('clip-path')!;
  const path = document.getElementById(clip.slice(5, -1))!.querySelector('path')!;
  expect(path.getAttribute('d')).toBe(fixtureMap.layers.land);
});

test('I-2: gemarkeerde kleine kenmerken krijgen een markeringsring op het labelpunt', () => {
  const tiny = { path: 'M100 100L110 104L112 110Z', kind: 'area' as const, labelPoint: [105, 105] as [number, number] };
  const map = { ...fixtureMap, features: { ...fixtureMap.features, klein: tiny } };
  const klein: TopoItem = { id: 'klein', name: 'Klein', category: 'zee', plus: false, aliases: [], mapFeatureId: 'klein' };
  const items = [...fixtureItems, klein];
  const { rerender } = render(<MapView map={map} items={items} />);
  expect(screen.queryByTestId('ring-klein')).toBeNull();
  rerender(<MapView map={map} items={items} highlights={{ klein: 'target', po: 'target', alpen: 'wrong' }} />);
  const ring = screen.getByTestId('ring-klein');
  expect(ring.tagName.toLowerCase()).toBe('circle');
  expect(ring).toHaveAttribute('cx', '105'); expect(ring).toHaveAttribute('cy', '105');
  expect(ring).toHaveAttribute('data-highlight', 'target');
  expect(Number(ring.getAttribute('r'))).toBeGreaterThanOrEqual(28);
  // grote kenmerken en lijnen krijgen geen ring
  expect(screen.queryByTestId('ring-alpen')).toBeNull();
  expect(screen.queryByTestId('ring-po')).toBeNull();
  // de ring ligt buiten de zee-clip zodat hij niet door land wordt weggeknipt
  expect(ring.closest('[clip-path]')).toBeNull();
});

test('pathBox: afmetingen van absolute en relatieve paden', () => {
  expect(pathBox('M10 20L30 5L25 40Z')).toEqual({ w: 20, h: 35 });
  expect(pathBox('M10 10h20v-5z')).toEqual({ w: 20, h: 5 });
});
