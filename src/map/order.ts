import type { MapFeature, TopoItem } from '../data/types';

const CATEGORY_RANK: Record<TopoItem['category'], number> = { zee: 0, gebergte: 1, rivier: 2 };

/** Z-order: zee, gebergte, rivier; within a category larger paths first so small shapes end up on top. */
export function orderItems(items: TopoItem[], features: Record<string, MapFeature>): TopoItem[] {
  const len = (i: TopoItem) => features[i.mapFeatureId]?.path.length ?? 0;
  return [...items].sort((a, b) => CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category] || len(b) - len(a));
}
