import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Resultaat from './Resultaat';
import { defaultList } from '../data/lists';
import type { QuizEntry } from '../data/types';

const ids = defaultList.items.slice(0, 4).map((i) => i.id);
const mistakes: QuizEntry[] = [
  { itemId: ids[0], mode: 'aanwijzen' },
  { itemId: ids[1], mode: 'benoemen' },
  { itemId: ids[2], mode: 'aanwijzen' },
  { itemId: ids[3], mode: 'benoemen' },
];
const nameOf = (id: string) => defaultList.items.find((i) => i.id === id)!.name;

function setup(summary: { total: number; correctFirstTry: number; mistakes: QuizEntry[] }) {
  const onPracticeMistakes = vi.fn();
  const onHome = vi.fn();
  render(<Resultaat list={defaultList} summary={summary} onPracticeMistakes={onPracticeMistakes} onHome={onHome} />);
  return { onPracticeMistakes, onHome };
}

test('toont de score', () => {
  setup({ total: 28, correctFirstTry: 24, mistakes });
  expect(screen.getByTestId('score')).toHaveTextContent('24 van 28 goed');
  expect(screen.getByTestId('resultaat')).toBeInTheDocument();
});

test('toont fouten met de juiste spelling en modus', () => {
  setup({ total: 28, correctFirstTry: 24, mistakes });
  const root = screen.getByTestId('resultaat');
  expect(root).toHaveTextContent(`Aanwijzen: ${nameOf(ids[0])}`);
  expect(root).toHaveTextContent(`Benoemen: ${nameOf(ids[1])}`);
  expect(root).toHaveTextContent(nameOf(ids[3]));
});

test('zonder fouten geen oefenknop', () => {
  setup({ total: 28, correctFirstTry: 28, mistakes: [] });
  expect(screen.queryByRole('button', { name: 'Oefen deze fouten' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Naar start' })).toBeInTheDocument();
});

test('totaal 0 crasht niet', () => {
  setup({ total: 0, correctFirstTry: 0, mistakes: [] });
  expect(screen.getByTestId('score')).toHaveTextContent('0 van 0 goed');
  expect(screen.queryByRole('button', { name: 'Oefen deze fouten' })).toBeNull();
});

test('oefenknop geeft exact de fouten door; Naar start roept onHome', async () => {
  const { onPracticeMistakes, onHome } = setup({ total: 28, correctFirstTry: 24, mistakes });
  await userEvent.click(screen.getByRole('button', { name: 'Oefen deze fouten' }));
  expect(onPracticeMistakes).toHaveBeenCalledWith(mistakes);
  await userEvent.click(screen.getByRole('button', { name: 'Naar start' }));
  expect(onHome).toHaveBeenCalledTimes(1);
});
