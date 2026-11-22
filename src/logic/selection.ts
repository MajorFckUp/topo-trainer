import type { Settings, TopoItem, TopoList } from '../data/types';
import { categoriesOf } from '../data/categories';

export const defaultSettings: Settings = { categories: ['gebergte', 'rivier', 'zee'], plus: false };

/** All categories of a list switched on, plus off. */
export function defaultSettingsFor(list: TopoList): Settings {
  return { categories: categoriesOf(list).map((c) => c.id), plus: false };
}

export function selectItems(list: TopoList, settings: Settings): TopoItem[] {
  return list.items.filter(i => settings.categories.includes(i.category) && (settings.plus || !i.plus));
}
