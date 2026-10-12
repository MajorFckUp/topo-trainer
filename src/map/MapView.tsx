import { useId, useMemo, useRef } from 'react';
import type { PointerEvent, MouseEvent } from 'react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import type { EuropeMap, TopoItem } from '../data/types';
import { orderItems } from './order';
import { pathBox } from './pathBox';
import { distanceToPath, rankCandidates } from './hit';
import type { HitCandidate } from './hit';
import './MapView.css';

export type Highlight = 'target' | 'correct' | 'wrong' | 'wrong-reveal' | 'selected';
export interface MapViewProps {
  map: EuropeMap;
  items: TopoItem[];
  showLabels?: boolean;
  highlights?: Record<string, Highlight>;
  /** `itemId` is the best-ranked item under the finger; `candidates` lists all of them, best first. */
  onItemTap?: (itemId: string, candidates: string[]) => void;
  reliefUrl?: string;
}

/** Lines get a narrower hit band so a river does not blanket its neighbours; areas keep a generous one. */
const HIT_STROKE_AREA = 56;
const HIT_STROKE_LINE = 32;
const TAP_SLOP = 8;
/** Highlighted features smaller than this (SVG units) also get a ring so a child can see them. */
const SMALL_FEATURE = 40;
const RING_RADIUS = 32;

/** All item ids whose hit zone is under the finger, best-ranked first. Falls back to the clicked one (jsdom). */
function candidatesAt(e: MouseEvent, clickedId: string): string[] {
  if (typeof document.elementsFromPoint !== 'function') return [clickedId];
  const hits = document
    .elementsFromPoint(e.clientX, e.clientY)
    .filter((el): el is SVGGeometryElement => (el.getAttribute('data-testid') ?? '').startsWith('hit-'));
  if (hits.length === 0) return [clickedId];
  const svg = hits[0].ownerSVGElement;
  const ctm = typeof svg?.getScreenCTM === 'function' ? svg.getScreenCTM() : null;
  const point = ctm && typeof DOMPoint === 'function' ? new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse()) : null;
  const ranked: HitCandidate[] = hits.map((hit) => {
    const g = hit.parentElement;
    const shape = g?.querySelector<SVGGeometryElement>('.shape');
    const kind = g?.getAttribute('data-kind') === 'line' ? 'line' : 'area';
    let contains = false;
    let dist = Infinity;
    if (point && shape && typeof shape.isPointInFill === 'function') {
      contains = kind === 'area' && shape.isPointInFill(point);
      dist = contains ? 0 : distanceToPath(shape, point.x, point.y);
    }
    return { id: hit.getAttribute('data-testid')!.slice('hit-'.length), kind, contains, dist };
  });
  const ids = rankCandidates(ranked);
  return ids.includes(clickedId) ? ids : [...ids, clickedId];
}

export default function MapView({
  map,
  items,
  showLabels = false,
  highlights = {},
  onItemTap,
  reliefUrl = `${import.meta.env.BASE_URL}maps/europe-relief.webp`,
}: MapViewProps) {
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const clipId = `nonland-${uid}`;
  const landClipId = `land-${uid}`;
  const frameClipId = `frame-${uid}`;
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const ordered = useMemo(() => orderItems(items, map.features), [items, map.features]);
  const smallIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of items) {
      const f = map.features[item.mapFeatureId];
      if (!f) continue;
      const { w, h } = pathBox(f.path);
      if (Math.max(w, h) < SMALL_FEATURE) ids.add(item.id);
    }
    return ids;
  }, [items, map.features]);
  const { width, height, layers } = map;

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    start.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const s = start.current;
    if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > TAP_SLOP) moved.current = true;
  };
  const tap = (e: MouseEvent, id: string) => {
    if (moved.current) return;
    const s = start.current;
    if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > TAP_SLOP) return;
    const candidates = candidatesAt(e, id);
    onItemTap?.(candidates[0], candidates);
  };

  return (
    <TransformWrapper minScale={1} maxScale={6} doubleClick={{ disabled: true }}>
      <TransformComponent
        wrapperStyle={{ width: '100%', height: '100%' }}
        contentStyle={{ width: '100%', height: '100%' }}
      >
        <svg
          data-testid="map-svg"
          className="map-svg"
          viewBox={`0 0 ${width} ${height}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
        >
          <defs>
            <clipPath id={clipId}>
              <path clipRule="evenodd" d={`M0 0H${width}V${height}H0Z${layers.land}`} />
            </clipPath>
            <clipPath id={landClipId}>
              <path d={layers.land} />
            </clipPath>
            <clipPath id={frameClipId}><rect width={width} height={height} /></clipPath>
          </defs>
          <g clipPath={`url(#${frameClipId})`}>
          <rect width={width} height={height} className="map-sea" />
          <path d={layers.land} className="map-land" />
          <image href={reliefUrl} width={width} height={height} className="map-relief" clipPath={`url(#${landClipId})`} preserveAspectRatio="none" />
          <path d={layers.lakes} className="map-lakes" />
          <path d={layers.borders} className="map-borders" />
          </g>
          {ordered.map((item) => {
            const f = map.features[item.mapFeatureId];
            if (!f) return null;
            const isLine = f.kind === 'line';
            return (
              <g
                key={item.id}
                data-testid={`feature-${item.id}`}
                data-highlight={highlights[item.id] ?? 'none'}
                data-kind={f.kind}
                data-category={item.category}
                clipPath={item.category === 'zee' ? `url(#${clipId})` : undefined}
              >
                <path d={f.path} className="shape" />
                <path
                  data-testid={`hit-${item.id}`}
                  d={f.path}
                  stroke="transparent"
                  strokeWidth={isLine ? HIT_STROKE_LINE : HIT_STROKE_AREA}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  fill={isLine ? 'none' : 'transparent'}
                  pointerEvents={isLine ? 'stroke' : 'all'}
                  onClick={(e) => tap(e, item.id)}
                />
              </g>
            );
          })}
          {ordered.map((item) => {
            const f = map.features[item.mapFeatureId];
            const hl = highlights[item.id];
            if (!f || !hl || !smallIds.has(item.id)) return null;
            return (
              <circle
                key={item.id}
                data-testid={`ring-${item.id}`}
                className="highlight-ring"
                data-highlight={hl}
                cx={f.labelPoint[0]}
                cy={f.labelPoint[1]}
                r={RING_RADIUS}
              />
            );
          })}
          {showLabels &&
            ordered.map((item) => {
              const f = map.features[item.mapFeatureId];
              if (!f) return null;
              return (
                <text
                  key={item.id}
                  data-testid={`label-${item.id}`}
                  className="map-label"
                  x={f.labelPoint[0]}
                  y={f.labelPoint[1]}
                  textAnchor="middle"
                >
                  {item.name}
                </text>
              );
            })}
        </svg>
      </TransformComponent>
    </TransformWrapper>
  );
}
