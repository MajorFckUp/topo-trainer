import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Onderwerp from './Onderwerp';
import { lists } from '../data/lists';
import { emptyProgress, recordAnswer } from '../logic/progress';

test('toont een knop per onderwerp met voortgang', () => {
  render(<Onderwerp lists={lists} progress={emptyProgress()} onPick={vi.fn()} />);
  for (const l of lists) {
    const b = screen.getByRole('button', { name: new RegExp(l.title) });
    expect(b).toHaveTextContent(`0 van ${l.items.length} geleerd`);
  }
});

test('klikken geeft het id van het onderwerp door', async () => {
  const onPick = vi.fn();
  render(<Onderwerp lists={lists} progress={emptyProgress()} onPick={onPick} />);
  await userEvent.click(screen.getByRole('button', { name: /Centraal-Europa/ }));
  expect(onPick).toHaveBeenCalledWith('centraal-europa');
});

test('geleerde onderdelen tellen mee en het laatst gekozen onderwerp is gemarkeerd', () => {
  let p = emptyProgress();
  for (let k = 0; k < 2; k++) for (const mode of ['aanwijzen', 'benoemen'] as const) p = recordAnswer(p, 'centraal-europa', 'parijs', mode, 'clean');
  render(<Onderwerp lists={lists} progress={p} lastListId="centraal-europa" onPick={vi.fn()} />);
  const b = screen.getByRole('button', { name: /Centraal-Europa/ });
  expect(b).toHaveTextContent('1 van 28 geleerd');
  expect(b).toHaveClass('laatste');
  expect(screen.getByRole('button', { name: /Gebergten, rivieren/ })).not.toHaveClass('laatste');
});
