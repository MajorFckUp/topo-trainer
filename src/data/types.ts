export type Category = 'gebergte' | 'rivier' | 'zee' | 'land' | 'stad' | 'gebied';
export type Mode = 'aanwijzen' | 'benoemen';
export type Outcome = 'clean' | 'accepted' | 'miss';
export interface TopoItem { id: string; name: string; category: Category; plus: boolean; aliases: string[]; mapFeatureId: string }
export interface TopoList { id: string; title: string; source: string; mapId: string; items: TopoItem[] }
export interface QuizEntry { itemId: string; mode: Mode }
export interface Settings { categories: Category[]; plus: boolean }
export interface MapFeature { path: string; kind: 'area' | 'line' | 'point'; labelPoint: [number, number] }
export interface TopoMap { id?: string; reliefUrl?: string; width: number; height: number; layers: { land: string; borders: string; lakes: string }; features: Record<string, MapFeature> }
