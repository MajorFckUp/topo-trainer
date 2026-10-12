import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import NamePrompt from './NamePrompt';
import { fixtureItems, fixtureMap } from '../test/fixtureMap';
import type { TopoItem } from '../data/types';

beforeEach(() => {
  vi.useFakeTimers();
  // Testing Library only drains its internal setTimeout under fake timers when a `jest` global exists.
  vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const mk = (id: string, name: string, mapFeatureId: string): TopoItem =>
  ({ id, name, category: 'rivier', plus: false, aliases: [], mapFeatureId });
const rhone = mk('rhone', 'Rhône', 'po');
const donau = mk('donau', 'Donau', 'alpen');
const maas = mk('maas', 'Maas', 'noordzee');
const items = [...fixtureItems, rhone, donau, maas];

function setup(item: TopoItem) {
  const onDone = vi.fn();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<NamePrompt item={item} items={items} map={fixtureMap} onDone={onDone} />);
  return { onDone, user };
}
const input = () => screen.getByRole('textbox', { name: 'Naam' });

test('root heeft testid, item en modus; doel is gemarkeerd; invoer heeft focus', () => {
  setup(donau);
  const p = screen.getByTestId('prompt');
  expect(p).toHaveAttribute('data-item-id', 'donau');
  expect(p).toHaveAttribute('data-mode', 'benoemen');
  expect(screen.getByTestId('feature-donau')).toHaveAttribute('data-highlight', 'target');
  expect(input()).toHaveFocus();
});

test('invoerveld heeft de verplichte attributen', () => {
  setup(donau);
  expect(input()).toHaveAttribute('autocomplete', 'off');
  expect(input()).toHaveAttribute('autocorrect', 'off');
  expect(input()).toHaveAttribute('autocapitalize', 'off');
  expect(input()).toHaveAttribute('spellcheck', 'false');
});

test('juist: Goed!, na 800 ms clean', async () => {
  const { onDone, user } = setup(rhone);
  await user.type(input(), 'Rhone');
  await user.click(screen.getByRole('button', { name: 'Controleer' }));
  expect(screen.getByTestId('prompt')).toHaveTextContent('Goed!');
  expect(screen.getByTestId('feature-rhone')).toHaveAttribute('data-highlight', 'correct');
  expect(input()).toBeDisabled();
  expect(onDone).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(800); });
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(onDone).toHaveBeenCalledWith('clean');
});

test('Enter verstuurt; dubbel versturen geeft een keer onDone', async () => {
  const { onDone, user } = setup(rhone);
  await user.type(input(), 'Rhone{Enter}');
  await user.click(screen.getByRole('button', { name: 'Controleer' }));
  act(() => { vi.advanceTimersByTime(2000); });
  expect(onDone).toHaveBeenCalledTimes(1);
});

test('lege invoer doet niets', async () => {
  const { onDone, user } = setup(rhone);
  await user.click(screen.getByRole('button', { name: 'Controleer' }));
  await user.type(input(), '   {Enter}');
  act(() => { vi.advanceTimersByTime(2000); });
  expect(onDone).not.toHaveBeenCalled();
  expect(input()).not.toBeDisabled();
  expect(screen.getByTestId('prompt')).not.toHaveTextContent('Goed!');
});

test('bijna goed: geaccepteerd, letters gemarkeerd, Verder geeft accepted', async () => {
  const { onDone, user } = setup(donau);
  await user.type(input(), 'Donua');
  await user.click(screen.getByRole('button', { name: 'Controleer' }));
  expect(screen.getByTestId('prompt')).toHaveTextContent('Bijna goed');
  expect(screen.getByTestId('given').querySelector('mark')).not.toBeNull();
  expect(screen.getByTestId('correct').querySelector('mark')).not.toBeNull();
  expect(screen.getByTestId('given')).toHaveTextContent('Donua');
  expect(screen.getByTestId('correct')).toHaveTextContent('Donau');
  act(() => { vi.advanceTimersByTime(2000); });
  expect(onDone).not.toHaveBeenCalled();
  const btn = screen.getByRole('button', { name: 'Verder' });
  await user.click(btn);
  await user.click(btn);
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(onDone).toHaveBeenCalledWith('accepted');
});

test('fout: toont het antwoord, typ over, daarna miss', async () => {
  const { onDone, user } = setup(maas);
  await user.type(input(), 'Rijn');
  await user.click(screen.getByRole('button', { name: 'Controleer' }));
  const p = screen.getByTestId('prompt');
  expect(p).toHaveTextContent('Het goede antwoord is: Maas');
  expect(p).toHaveTextContent('Typ de naam over');
  expect(screen.getByTestId('feature-maas')).toHaveAttribute('data-highlight', 'wrong-reveal');
  expect(input()).toHaveValue('');
  expect(input()).not.toBeDisabled();
  // fout overtypen: blijft wachten
  await user.type(input(), 'Rijn{Enter}');
  act(() => { vi.advanceTimersByTime(2000); });
  expect(onDone).not.toHaveBeenCalled();
  await user.clear(input());
  await user.type(input(), 'Maas');
  await user.click(screen.getByRole('button', { name: 'Controleer' }));
  await user.click(screen.getByRole('button', { name: 'Controleer' }));
  act(() => { vi.advanceTimersByTime(2000); });
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(onDone).toHaveBeenCalledWith('miss');
});

test('timer wordt opgeruimd bij unmount', async () => {
  const onDone = vi.fn();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const { unmount } = render(<NamePrompt item={rhone} items={items} map={fixtureMap} onDone={onDone} />);
  await user.type(input(), 'Rhone{Enter}');
  unmount();
  act(() => { vi.advanceTimersByTime(2000); });
  expect(onDone).not.toHaveBeenCalled();
});

test('I-1: schone invoer zonder accent of lidwoord toont daarna de juiste schrijfwijze', async () => {
  const hetKanaal: TopoItem = { id: 'kanaal', name: 'Het Kanaal', category: 'zee', plus: false, aliases: ['Kanaal'], mapFeatureId: 'noordzee' };
  const pyreneeen: TopoItem = { id: 'pyreneeen', name: 'Pyreneeën', category: 'gebergte', plus: false, aliases: [], mapFeatureId: 'alpen' };
  for (const [item, typed, shown] of [[rhone, 'rhone', 'Rhône'], [hetKanaal, 'kanaal', 'Het Kanaal'], [pyreneeen, 'pyreneeen', 'Pyreneeën']] as const) {
    const { unmount } = render(<NamePrompt item={item} items={[...items, item]} map={fixtureMap} onDone={vi.fn()} />);
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).type(input(), `${typed}{Enter}`);
    expect(screen.getByTestId('prompt')).toHaveTextContent(`Goed! ${shown}`);
    unmount();
  }
});

test('I-1: na overtypen toont de bevestiging ook de juiste schrijfwijze', async () => {
  const { user } = setup(rhone);
  await user.type(input(), 'Seine{Enter}');
  await user.type(input(), 'rhone{Enter}');
  expect(screen.getByTestId('prompt')).toHaveTextContent('Goed! Rhône');
});

test('M-3: alleen leestekens + Enter is een no-op (net als lege invoer)', async () => {
  const { onDone, user } = setup(rhone);
  await user.type(input(), '.{Enter}');
  act(() => { vi.advanceTimersByTime(2000); });
  expect(onDone).not.toHaveBeenCalled();
  expect(input()).not.toBeDisabled();
  expect(screen.getByTestId('prompt')).toHaveTextContent('Hoe heet dit?');
  expect(screen.getByTestId('prompt')).not.toHaveTextContent('Typ de naam over');
});
