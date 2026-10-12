import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import QuizScreen from './QuizScreen';
import { fixtureItems, fixtureMap } from '../test/fixtureMap';
import type { QuizEntry, TopoList } from '../data/types';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const list: TopoList = { id: 'l', title: 'L', source: 's', items: fixtureItems };
const entries = (...ids: string[]): QuizEntry[] => ids.map((itemId) => ({ itemId, mode: 'aanwijzen' }));

function setup(e: QuizEntry[]) {
  const onRecord = vi.fn();
  const onFinish = vi.fn();
  const onQuit = vi.fn();
  render(<QuizScreen list={list} entries={e} items={fixtureItems} map={fixtureMap} onRecord={onRecord} onFinish={onFinish} onQuit={onQuit} />);
  return { onRecord, onFinish, onQuit };
}
const target = () => screen.getByTestId('prompt').getAttribute('data-item-id')!;
const tapCorrect = () => {
  fireEvent.click(screen.getByTestId(`hit-${target()}`));
  act(() => { vi.advanceTimersByTime(800); });
};
const tapWrong = () => {
  const other = fixtureItems.find((i) => i.id !== target())!;
  fireEvent.click(screen.getByTestId(`hit-${other.id}`));
};

test('ronde met alles goed: twee records en samenvatting', () => {
  const { onRecord, onFinish } = setup(entries('po', 'alpen'));
  expect(screen.getByText('0 van 2')).toBeInTheDocument();
  tapCorrect();
  expect(screen.getByText('1 van 2')).toBeInTheDocument();
  tapCorrect();
  expect(onRecord).toHaveBeenCalledTimes(2);
  expect(onRecord.mock.calls.every((c) => c[1] === 'clean')).toBe(true);
  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish.mock.calls[0][0]).toMatchObject({ total: 2, correctFirstTry: 2 });
});

test('fout en daarna goed: een record (miss), een fout in de samenvatting', () => {
  const { onRecord, onFinish } = setup(entries('po'));
  tapWrong();
  fireEvent.click(screen.getByRole('button', { name: 'Verder' }));
  expect(onRecord).toHaveBeenCalledTimes(1);
  expect(onRecord).toHaveBeenCalledWith({ itemId: 'po', mode: 'aanwijzen' }, 'miss');
  expect(onFinish).not.toHaveBeenCalled();
  tapCorrect();
  expect(onRecord).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledTimes(1);
  const s = onFinish.mock.calls[0][0];
  expect(s.total).toBe(1);
  expect(s.correctFirstTry).toBe(0);
  expect(s.mistakes).toHaveLength(1);
});

test('lege lijst: direct klaar met total 0', () => {
  const { onFinish } = setup([]);
  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish.mock.calls[0][0]).toMatchObject({ total: 0, correctFirstTry: 0 });
});

test('dubbel Verder klikken slaat de volgende vraag niet over', () => {
  const { onRecord } = setup(entries('po', 'alpen', 'noordzee'));
  tapWrong();
  const btn = screen.getByRole('button', { name: 'Verder' });
  fireEvent.click(btn);
  fireEvent.click(btn);
  expect(onRecord).toHaveBeenCalledTimes(1);
  expect(screen.getByText('0 van 3')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Verder' })).toBeNull();
});

const nameEntries = (...ids: string[]): QuizEntry[] => ids.map((itemId) => ({ itemId, mode: 'benoemen' }));
const typeName = (v: string) => {
  fireEvent.change(screen.getByRole('textbox', { name: 'Naam' }), { target: { value: v } });
  fireEvent.click(screen.getByRole('button', { name: 'Controleer' }));
};

test('benoemen-opdracht rendert NamePrompt', () => {
  setup(nameEntries('po'));
  expect(screen.getByTestId('prompt')).toHaveAttribute('data-mode', 'benoemen');
});

test('benoemen: bijna goed wordt als accepted vastgelegd en niet herhaald', () => {
  const { onRecord, onFinish } = setup(nameEntries('alpen'));
  typeName('Alpne');
  fireEvent.click(screen.getByRole('button', { name: 'Verder' }));
  expect(onRecord).toHaveBeenCalledWith({ itemId: 'alpen', mode: 'benoemen' }, 'accepted');
  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish.mock.calls[0][0].mistakes).toHaveLength(0);
});

test('benoemen: fout wordt miss en komt terug', () => {
  const { onRecord, onFinish } = setup(nameEntries('alpen'));
  typeName('Rijn');
  typeName('Alpen');
  act(() => { vi.advanceTimersByTime(800); });
  expect(onRecord).toHaveBeenCalledWith({ itemId: 'alpen', mode: 'benoemen' }, 'miss');
  expect(onFinish).not.toHaveBeenCalled();
  expect(screen.getByTestId('prompt')).toHaveAttribute('data-item-id', 'alpen');
  typeName('Alpen');
  act(() => { vi.advanceTimersByTime(800); });
  expect(onRecord).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test('Stop roept onQuit aan', () => {
  const { onQuit } = setup(entries('po'));
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
  expect(onQuit).toHaveBeenCalledTimes(1);
});
