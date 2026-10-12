import type { Settings, TopoItem, TopoList } from '../data/types';

export const defaultSettings: Settings = { categories: ['gebergte', 'rivier', 'zee'], plus: false };

export function selectItems(list: TopoList, settings: Settings): TopoItem[] {
  return list.items.filter(i => settings.categories.includes(i.category) && (settings.plus || !i.plus));
}
