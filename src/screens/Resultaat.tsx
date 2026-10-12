import type { QuizEntry, TopoList } from '../data/types';
import type { Summary } from '../logic/quiz';

export interface ResultaatProps {
  list: TopoList;
  summary: Summary;
  onPracticeMistakes: (entries: QuizEntry[]) => void;
  onHome: () => void;
}

export default function Resultaat({ list, summary, onPracticeMistakes, onHome }: ResultaatProps) {
  const { total, correctFirstTry, mistakes } = summary;
  const rows = mistakes.flatMap((e) => {
    const item = list.items.find((i) => i.id === e.itemId);
    return item ? [{ key: `${e.mode}:${e.itemId}`, label: `${e.mode === 'aanwijzen' ? 'Aanwijzen' : 'Benoemen'}: ${item.name}` }] : [];
  });

  return (
    <main className="resultaat" data-testid="resultaat">
      <h1>Klaar!</h1>
      <p className="score" data-testid="score">{correctFirstTry} van {total} goed</p>
      {rows.length > 0 && (
        <section className="resultaat-fouten" aria-label="Dit ging fout">
          <h2>Dit ging fout</h2>
          <ul>
            {rows.map((r) => <li key={r.key}>{r.label}</li>)}
          </ul>
        </section>
      )}
      <div className="resultaat-actions">
        {mistakes.length > 0 && (
          <button className="big" onClick={() => onPracticeMistakes(mistakes)}>Oefen deze fouten</button>
        )}
        <button className="big secondary" onClick={onHome}>Naar start</button>
      </div>
    </main>
  );
}
