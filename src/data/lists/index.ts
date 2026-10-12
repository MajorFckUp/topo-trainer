import europa from './europa-grz.json';
import type { TopoList } from '../types';
export const lists: TopoList[] = [europa as TopoList];
export const defaultList: TopoList = lists[0];
export function getList(id: string): TopoList {
  const l = lists.find(x => x.id === id);
  if (!l) throw new Error(`Unknown list: ${id}`);
  return l;
}
