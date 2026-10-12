import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './Home';
import { fixtureItems } from '../test/fixtureMap';
import { defaultSettings } from '../logic/selection';
import { emptyProgress, recordAnswer } from '../logic/progress';
import type { Progress } from '../logic/progress';
import type { Settings, TopoList } from '../data/types';

const list: TopoList = { id: 'fx', title: 'Fixture', source: 'test', items: fixtureItems };
function setup(over: { settings?: Settings; progress?: Progress } = {}) {
  const props = {
    list,
    settings: over.settings ?? defaultSettings,
    onSettings: vi.fn(),
    progress: over.progress ?? emptyProgress(),
    onStart: vi.fn(),
    onVoortgang: vi.fn(),
  };
  render(<Home {...props} />);
  return props;
}

test('toont titel en alle knoppen/vinkjes', () => {
  setup();
  expect(screen.getByRole('heading', { name: /topo trainer/i })).toBeInTheDocument();
  for (const n of ['Verkennen', 'Aanwijzen', 'Benoemen', 'Oefen mijn fouten', 'Voortgang'])
    expect(screen.getByRole('button', { name: n })).toBeEnabled();
  for (const n of ['Gebergten', 'Rivieren', 'Zeeën en zeestraten', 'Plus'])
    expect(screen.getByRole('checkbox', { name: n })).toBeInTheDocument();
});

test('startknoppen uit bij lege selectie, met hint', () => {
  setup({ settings: { categories: [], plus: false } });
  for (const n of ['Verkennen', 'Aanwijzen', 'Benoemen']) expect(screen.getByRole('button', { name: n })).toBeDisabled();
  expect(screen.getByText('Kies minstens één onderdeel.')).toBeInTheDocument();
});

test('Oefen mijn fouten is aan bij verse voortgang, zonder melding', () => {
  setup();
  expect(screen.getByRole('button', { name: 'Oefen mijn fouten' })).toBeEnabled();
  expect(screen.queryByText('Alles geleerd — goed gedaan!')).toBeNull();
});

test('alles geleerd: knop uit en melding zichtbaar', () => {
  let p = emptyProgress();
  for (const i of fixtureItems)
    for (const m of ['aanwijzen', 'benoemen'] as const)
      for (let k = 0; k < 2; k++) p = recordAnswer(p, 'fx', i.id, m, 'clean');
  setup({ progress: p });
  expect(screen.getByRole('button', { name: 'Oefen mijn fouten' })).toBeDisabled();
  expect(screen.getByText('Alles geleerd — goed gedaan!')).toBeInTheDocument();
});

test('Plus aanvinken roept onSettings', async () => {
  const p = setup();
  await userEvent.click(screen.getByRole('checkbox', { name: 'Plus' }));
  expect(p.onSettings).toHaveBeenCalledWith({ ...defaultSettings, plus: true });
});

test('categorie uitvinken roept onSettings', async () => {
  const p = setup();
  await userEvent.click(screen.getByRole('checkbox', { name: 'Rivieren' }));
  expect(p.onSettings).toHaveBeenCalledWith({ ...defaultSettings, categories: ['gebergte', 'zee'] });
});

test('starten en voortgang', async () => {
  const p = setup();
  await userEvent.click(screen.getByRole('button', { name: 'Aanwijzen' }));
  expect(p.onStart).toHaveBeenCalledWith('aanwijzen');
  await userEvent.click(screen.getByRole('button', { name: 'Oefen mijn fouten' }));
  expect(p.onStart).toHaveBeenCalledWith('fouten');
  await userEvent.click(screen.getByRole('button', { name: 'Voortgang' }));
  expect(p.onVoortgang).toHaveBeenCalled();
});
