import { selectItems, defaultSettings } from './selection';
import { defaultList } from '../data/lists';
test('standaard: 23 items (zonder plus)', () => { expect(selectItems(defaultList, defaultSettings)).toHaveLength(23); });
test('plus aan: 28', () => { expect(selectItems(defaultList, { ...defaultSettings, plus: true })).toHaveLength(28); });
test('alleen rivieren', () => { expect(selectItems(defaultList, { categories: ['rivier'], plus: false })).toHaveLength(9); });
test('geen categorieën → leeg', () => { expect(selectItems(defaultList, { categories: [], plus: true })).toEqual([]); });
