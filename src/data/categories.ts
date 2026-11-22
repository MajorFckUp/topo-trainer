import type { Category, TopoList } from './types';

export const CATEGORY_LABELS: Record<Category, string> = {
  gebergte: 'Gebergten',
  rivier: 'Rivieren',
  zee: 'Zeeën en zeestraten',
  land: 'Landen',
  stad: 'Steden',
  gebied: 'Gebieden',
};

const ORDER: Category[] = ['land', 'stad', 'gebied', 'gebergte', 'rivier', 'zee'];

/** Categories used by a list, in a fixed display order. */
export function categoriesOf(list: TopoList): { id: Category; label: string }[] {
  return ORDER.filter((c) => list.items.some((i) => i.category === c)).map((id) => ({ id, label: CATEGORY_LABELS[id] }));
}
