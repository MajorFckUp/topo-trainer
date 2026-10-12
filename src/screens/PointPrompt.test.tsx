import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import PointPrompt from './PointPrompt';
import { fixtureItems, fixtureMap } from '../test/fixtureMap';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const po = fixtureItems[0];
function setup() {
  const onDone = vi.fn();
  render(<PointPrompt item={po} items={fixtureItems} map={fixtureMap} onDone={onDone} />);
  return onDone;
}

test('toont de opdracht met de naam', () => {
  setup();
  const p = screen.getByTestId('prompt');
  expect(p).toHaveAttribute('data-item-id', 'po');
  expect(p).toHaveAttribute('data-mode', 'aanwijzen');
  expect(p).toHaveTextContent('Wijs Po aan');
});

test('juist getikt: correct, na 800 ms clean', () => {
  const onDone = setup();
  fireEvent.click(screen.getByTestId('hit-po'));
  expect(screen.getByTestId('feature-po')).toHaveAttribute('data-highlight', 'correct');
  expect(onDone).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(800); });
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(onDone).toHaveBeenCalledWith('clean');
});

test('dubbel tikken op het juiste item geeft een keer onDone', () => {
  const onDone = setup();
  fireEvent.click(screen.getByTestId('hit-po'));
  fireEvent.click(screen.getByTestId('hit-po'));
  act(() => { vi.advanceTimersByTime(2000); });
  expect(onDone).toHaveBeenCalledTimes(1);
});

test('fout getikt: onthult het antwoord en wacht op Verder', () => {
  const onDone = setup();
  fireEvent.click(screen.getByTestId('hit-alpen'));
  expect(screen.getByTestId('feature-alpen')).toHaveAttribute('data-highlight', 'wrong');
  expect(screen.getByTestId('feature-po')).toHaveAttribute('data-highlight', 'wrong-reveal');
  expect(screen.getByTestId('prompt')).toHaveTextContent('Dat was Alpen. Dit is Po.');
  act(() => { vi.advanceTimersByTime(2000); });
  expect(onDone).not.toHaveBeenCalled();
  const btn = screen.getByRole('button', { name: 'Verder' });
  fireEvent.click(btn);
  fireEvent.click(btn);
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(onDone).toHaveBeenCalledWith('miss');
});

test('na een eerste tik tellen verdere tikken niet', () => {
  const onDone = setup();
  fireEvent.click(screen.getByTestId('hit-alpen'));
  fireEvent.click(screen.getByTestId('hit-po'));
  expect(screen.getByTestId('feature-po')).toHaveAttribute('data-highlight', 'wrong-reveal');
  act(() => { vi.advanceTimersByTime(2000); });
  expect(onDone).not.toHaveBeenCalled();
});

test('timer wordt opgeruimd bij unmount', () => {
  const onDone = vi.fn();
  const { unmount } = render(<PointPrompt item={po} items={fixtureItems} map={fixtureMap} onDone={onDone} />);
  fireEvent.click(screen.getByTestId('hit-po'));
  unmount();
  act(() => { vi.advanceTimersByTime(2000); });
  expect(onDone).not.toHaveBeenCalled();
});

test('forgiving: tik waar een rivier-hitzone over het gebied ligt telt als goed voor het gebied', () => {
  const onDone = vi.fn();
  const alpen = fixtureItems[1];
  render(<PointPrompt item={alpen} items={fixtureItems} map={fixtureMap} onDone={onDone} />);
  (document as unknown as { elementsFromPoint: unknown }).elementsFromPoint = () =>
    [screen.getByTestId('hit-po'), screen.getByTestId('hit-alpen')];
  try {
    fireEvent.click(screen.getByTestId('hit-po'));
  } finally {
    delete (document as unknown as { elementsFromPoint?: unknown }).elementsFromPoint;
  }
  expect(screen.getByTestId('feature-alpen')).toHaveAttribute('data-highlight', 'correct');
  act(() => { vi.advanceTimersByTime(800); });
  expect(onDone).toHaveBeenCalledWith('clean');
});

test('fout: de naam in de feedback is de best gerangschikte kandidaat', () => {
  const onDone = setup();
  (document as unknown as { elementsFromPoint: unknown }).elementsFromPoint = () => [screen.getByTestId('hit-alpen')];
  try {
    fireEvent.click(screen.getByTestId('hit-alpen'));
  } finally {
    delete (document as unknown as { elementsFromPoint?: unknown }).elementsFromPoint;
  }
  expect(screen.getByTestId('prompt')).toHaveTextContent('Dat was Alpen.');
  expect(onDone).not.toHaveBeenCalled();
});
