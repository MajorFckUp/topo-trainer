import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Verkennen from './Verkennen';
import { fixtureMap, fixtureItems } from '../test/fixtureMap';
import type { TopoList } from '../data/types';

const list: TopoList = { id: 'fx', title: 'Fixture', source: 'test', items: fixtureItems };
const setup = (items = fixtureItems) => {
  const onBack = vi.fn();
  render(<Verkennen list={list} items={items} map={fixtureMap} onBack={onBack} />);
  return { onBack };
};

test('kaart met labels en lijst met categoriekoppen', () => {
  setup();
  expect(screen.getByTestId('label-po')).toHaveTextContent('Po');
  for (const h of ['Gebergten', 'Rivieren', 'Zeeën en zeestraten'])
    expect(screen.getByRole('heading', { name: h })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Po' })).toBeInTheDocument();
});

test('alleen items uit de items-prop; lege categorie geen kop', () => {
  setup([fixtureItems[0]]);
  expect(screen.getAllByTestId(/^feature-/)).toHaveLength(1);
  expect(screen.queryByRole('heading', { name: 'Gebergten' })).toBeNull();
});

test('klik op lijst markeert enkel dat kenmerk', async () => {
  setup();
  await userEvent.click(screen.getByRole('button', { name: 'Alpen' }));
  expect(screen.getByTestId('feature-alpen')).toHaveAttribute('data-highlight', 'selected');
  expect(screen.getByTestId('feature-po')).toHaveAttribute('data-highlight', 'none');
  await userEvent.click(screen.getByRole('button', { name: 'Po' }));
  expect(screen.getByTestId('feature-po')).toHaveAttribute('data-highlight', 'selected');
  expect(screen.getByTestId('feature-alpen')).toHaveAttribute('data-highlight', 'none');
});

test('tap op kaart markeert en toont grote naam', () => {
  setup();
  fireEvent.click(screen.getByTestId('hit-po'));
  expect(screen.getByTestId('feature-po')).toHaveAttribute('data-highlight', 'selected');
  expect(screen.getByTestId('verkennen-caption')).toHaveTextContent('Po');
});

test('Terug roept onBack', async () => {
  const { onBack } = setup();
  await userEvent.click(screen.getByRole('button', { name: 'Terug' }));
  expect(onBack).toHaveBeenCalled();
});
