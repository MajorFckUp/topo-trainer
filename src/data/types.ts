export type Category = 'gebergte' | 'rivier' | 'zee';
export type Mode = 'aanwijzen' | 'benoemen';
export type Outcome = 'clean' | 'accepted' | 'miss';
export interface TopoItem { id: string; name: string; category: Category; plus: boolean; aliases: string[]; mapFeatureId: string }
export interface TopoList { id: string; title: string; source: string; items: TopoItem[] }
export interface QuizEntry { itemId: string; mode: Mode }
export interface Settings { categories: Category[]; plus: boolean }
export interface MapFeature { path: string; kind: 'area' | 'line'; labelPoint: [number, number] }
export interface EuropeMap { width: number; height: number; layers: { land: string; borders: string; lakes: string }; features: Record<string, MapFeature> }
