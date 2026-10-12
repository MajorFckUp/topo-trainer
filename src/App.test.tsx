import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import App from './App';
import { defaultList } from './data/lists';
import { defaultSettings, selectItems } from './logic/selection';
import { emptyProgress, recordAnswer, weakEntries } from './logic/progress';

beforeEach(() => localStorage.clear());

test('toont de titel', () => { render(<App />); expect(screen.getByRole('heading', { name: /topo trainer/i })).toBeInTheDocument(); });

test('Verkennen opent, Terug keert terug naar Home', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Verkennen' }));
  expect(screen.queryByRole('heading', { name: /topo trainer/i })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Terug' }));
  expect(screen.getByRole('heading', { name: /topo trainer/i })).toBeInTheDocument();
});

test('instellingen blijven bewaard na terugkeren', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Plus' }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Rivieren' }));
  await userEvent.click(screen.getByRole('button', { name: 'Verkennen' }));
  await userEvent.click(screen.getByRole('button', { name: 'Terug' }));
  expect(screen.getByRole('checkbox', { name: 'Plus' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Rivieren' })).not.toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Gebergten' })).toBeChecked();
});

test('Aanwijzen maakt een aanwijs-opdracht per geselecteerd onderdeel', async () => {
  const n = selectItems(defaultList, defaultSettings).length;
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Aanwijzen' }));
  expect(screen.getByText(`0 van ${n}`)).toBeInTheDocument();
  const p = screen.getByTestId('prompt');
  expect(p).toHaveAttribute('data-mode', 'aanwijzen');
  const ids = selectItems(defaultList, defaultSettings).map((i) => i.id);
  expect(ids).toContain(p.getAttribute('data-item-id'));
});

test('Benoemen start een benoem-opdracht met invoerveld', async () => {
  const n = selectItems(defaultList, defaultSettings).length;
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Benoemen' }));
  expect(screen.getByText(`0 van ${n}`)).toBeInTheDocument();
  expect(screen.getByTestId('prompt')).toHaveAttribute('data-mode', 'benoemen');
  expect(screen.getByRole('textbox', { name: 'Naam' })).toBeInTheDocument();
});

test('Oefen mijn fouten met verse voortgang: totaal is 2 x geselecteerde onderdelen', async () => {
  const n = selectItems(defaultList, defaultSettings).length;
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Oefen mijn fouten' }));
  expect(screen.getByText(`0 van ${2 * n}`)).toBeInTheDocument();
});

test('niets te oefenen: knop uitgeschakeld met melding, klikken doet niets', async () => {
  let p = emptyProgress();
  for (const i of selectItems(defaultList, defaultSettings))
    for (const mode of ['aanwijzen', 'benoemen'] as const)
      for (let k = 0; k < 2; k++) p = recordAnswer(p, defaultList.id, i.id, mode, 'clean');
  localStorage.setItem('topo-trainer:v1', JSON.stringify(p));
  render(<App />);
  const btn = screen.getByRole('button', { name: 'Oefen mijn fouten' });
  expect(btn).toBeDisabled();
  expect(screen.getByText('Alles geleerd — goed gedaan!')).toBeInTheDocument();
  await userEvent.click(btn);
  expect(screen.getByRole('heading', { name: /topo trainer/i })).toBeInTheDocument();
  expect(screen.queryByTestId('prompt')).toBeNull();
});

test('Oefen mijn fouten maakt opdrachten uit weakEntries', async () => {
  const items = selectItems(defaultList, defaultSettings);
  const n = weakEntries(emptyProgress(), defaultList, items).length;
  expect(n).toBeGreaterThan(0);
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Oefen mijn fouten' }));
  expect(screen.getByText(`0 van ${n}`)).toBeInTheDocument();
});

test('Stop in de quiz keert terug naar Home', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Aanwijzen' }));
  await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
  expect(screen.getByRole('heading', { name: /topo trainer/i })).toBeInTheDocument();
});

test('eerste antwoord wordt bewaard in de voortgang', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Aanwijzen' }));
  const id = screen.getByTestId('prompt').getAttribute('data-item-id')!;
  fireEvent.click(screen.getByTestId(`hit-${id}`));
  await waitFor(() => expect(localStorage.getItem('topo-trainer:v1')).toContain(id), { timeout: 2000 });
});

describe('ronde tot Resultaat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const click = (el: HTMLElement) => act(() => { fireEvent.click(el); });
  const pick = (name: string) => click(screen.getByRole('button', { name }));
  const target = () => screen.getByTestId('prompt').getAttribute('data-item-id')!;
  const answerRight = () => {
    click(screen.getByTestId(`hit-${target()}`));
    act(() => { vi.advanceTimersByTime(800); });
  };
  const onlyRivers = () => {
    click(screen.getByRole('checkbox', { name: 'Gebergten' }));
    click(screen.getByRole('checkbox', { name: 'Zeeën en zeestraten' }));
  };
  const riverCount = () => selectItems(defaultList, { categories: ['rivier'], plus: defaultSettings.plus }).length;

  test('goede ronde: score en Naar start', () => {
    render(<App />);
    onlyRivers();
    const n = riverCount();
    pick('Aanwijzen');
    for (let k = 0; k < n; k++) answerRight();
    expect(screen.getByTestId('score')).toHaveTextContent(`${n} van ${n} goed`);
    expect(screen.queryByRole('button', { name: 'Oefen deze fouten' })).toBeNull();
    pick('Naar start');
    expect(screen.getByRole('heading', { name: /topo trainer/i })).toBeInTheDocument();
  });

  test('Oefen deze fouten start een ronde met precies de fouten', () => {
    render(<App />);
    onlyRivers();
    const n = riverCount();
    pick('Aanwijzen');
    const first = target();
    const other = defaultList.items.find((i) => i.category === 'rivier' && i.id !== first)!;
    click(screen.getByTestId(`hit-${other.id}`));
    pick('Verder');
    for (let k = 0; k < n; k++) answerRight();
    expect(screen.getByTestId('score')).toHaveTextContent(`${n - 1} van ${n} goed`);
    pick('Oefen deze fouten');
    expect(screen.getByTestId('progress')).toHaveTextContent('0 van 1');
    expect(screen.getByTestId('prompt')).toHaveAttribute('data-item-id', first);
    expect(screen.getByTestId('prompt')).toHaveAttribute('data-mode', 'aanwijzen');
  });
});

test('Voortgang opent en Terug keert naar Home', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Voortgang' }));
  expect(screen.getByText(`0 van ${defaultList.items.length} geleerd`)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Terug' }));
  expect(screen.getByRole('heading', { name: /topo trainer/i })).toBeInTheDocument();
});

test('Wis voortgang in App leegt de opslag', async () => {
  localStorage.setItem('topo-trainer:v1', JSON.stringify(recordAnswer(emptyProgress(), defaultList.id, defaultList.items[0].id, 'aanwijzen', 'clean')));
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Voortgang' }));
  await userEvent.click(screen.getByRole('button', { name: 'Wis voortgang' }));
  await userEvent.click(screen.getByRole('button', { name: 'Ja, wis alles' }));
  expect(localStorage.getItem('topo-trainer:v1')).toBeNull();
});
