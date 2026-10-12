import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Voortgang from './Voortgang';
import { defaultList } from '../data/lists';
import { emptyProgress, recordAnswer } from '../logic/progress';

const [a, b] = defaultList.items;

function seeded() {
  let p = emptyProgress();
  for (const mode of ['aanwijzen', 'benoemen'] as const)
    for (let k = 0; k < 2; k++) p = recordAnswer(p, defaultList.id, a.id, mode, 'clean');
  p = recordAnswer(p, defaultList.id, b.id, 'aanwijzen', 'clean');
  return p;
}

function setup() {
  const onReset = vi.fn();
  const onBack = vi.fn();
  render(<Voortgang list={defaultList} progress={seeded()} onReset={onReset} onBack={onBack} />);
  return { onReset, onBack };
}

test('vinkje voor geleerd item, niet voor andere', () => {
  setup();
  expect(screen.getByTestId(`mastered-${a.id}`)).toBeInTheDocument();
  expect(screen.queryByTestId(`mastered-${b.id}`)).toBeNull();
});

test('toont groepen, alle items en samenvatting', () => {
  setup();
  for (const h of ['Gebergten', 'Rivieren', 'Zeeën en zeestraten']) expect(screen.getByRole('heading', { name: h })).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(defaultList.items.length);
  expect(screen.getByText(`1 van ${defaultList.items.length} geleerd`)).toBeInTheDocument();
  expect(screen.getByLabelText(`${b.name}: aanwijzen 1 van 2, benoemen 0 van 2`)).toBeInTheDocument();
});

test('Terug roept onBack', async () => {
  const { onBack } = setup();
  await userEvent.click(screen.getByRole('button', { name: 'Terug' }));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('wissen vraagt bevestiging; Annuleer wist niet', async () => {
  const { onReset } = setup();
  await userEvent.click(screen.getByRole('button', { name: 'Wis voortgang' }));
  expect(screen.getByText('Weet je het zeker?')).toBeInTheDocument();
  expect(onReset).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Annuleer' }));
  expect(onReset).not.toHaveBeenCalled();
  expect(screen.queryByText('Weet je het zeker?')).toBeNull();
  expect(screen.getByRole('button', { name: 'Wis voortgang' })).toBeInTheDocument();
});

test('Ja, wis alles roept onReset', async () => {
  const { onReset } = setup();
  await userEvent.click(screen.getByRole('button', { name: 'Wis voortgang' }));
  await userEvent.click(screen.getByRole('button', { name: 'Ja, wis alles' }));
  expect(onReset).toHaveBeenCalledTimes(1);
});
