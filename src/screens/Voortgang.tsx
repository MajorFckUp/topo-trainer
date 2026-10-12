import { useState } from 'react';
import type { Category, TopoList } from '../data/types';
import type { Progress } from '../logic/progress';
import { isMastered, MASTERY_STREAK, streaksOf } from '../logic/progress';

export interface VoortgangProps {
  list: TopoList;
  progress: Progress;
  onReset: () => void;
  onBack: () => void;
}

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'gebergte', label: 'Gebergten' },
  { id: 'rivier', label: 'Rivieren' },
  { id: 'zee', label: 'Zeeën en zeestraten' },
];

export default function Voortgang({ list, progress, onReset, onBack }: VoortgangProps) {
  const [confirming, setConfirming] = useState(false);
  const learned = list.items.filter((i) => isMastered(progress, list.id, i.id)).length;

  return (
    <main className="voortgang">
      <div className="voortgang-bar">
        <button className="big secondary" onClick={onBack}>Terug</button>
        <h1>Voortgang</h1>
        <span className="voortgang-summary">{learned} van {list.items.length} geleerd</span>
        {confirming ? (
          <div className="voortgang-confirm" role="group" aria-label="Bevestig wissen">
            <span>Weet je het zeker?</span>
            <button onClick={() => { setConfirming(false); onReset(); }}>Ja, wis alles</button>
            <button onClick={() => setConfirming(false)}>Annuleer</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)}>Wis voortgang</button>
        )}
      </div>
      <div className="voortgang-list">
        {CATEGORIES.map((c) => {
          const items = list.items.filter((i) => i.category === c.id);
          if (items.length === 0) return null;
          return (
            <section key={c.id}>
              <h2>{c.label}</h2>
              <ul>
                {items.map((i) => {
                  const s = streaksOf(progress, list.id, i.id);
                  const a = Math.min(s.aanwijzen, MASTERY_STREAK);
                  const b = Math.min(s.benoemen, MASTERY_STREAK);
                  return (
                    <li key={i.id}>
                      <span className="voortgang-name">{i.name}</span>
                      {isMastered(progress, list.id, i.id) ? (
                        <span className="mastered" data-testid={`mastered-${i.id}`} role="img" aria-label={`${i.name}: geleerd`}>✓</span>
                      ) : (
                        <span
                          className="streaks"
                          role="img"
                          aria-label={`${i.name}: aanwijzen ${a} van ${MASTERY_STREAK}, benoemen ${b} van ${MASTERY_STREAK}`}
                        >
                          Aanwijzen {a}/{MASTERY_STREAK} · Benoemen {b}/{MASTERY_STREAK}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
