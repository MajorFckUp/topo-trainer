import type { TopoList } from '../data/types';
import type { Progress } from '../logic/progress';
import { isMastered } from '../logic/progress';

export interface OnderwerpProps {
  lists: TopoList[];
  progress: Progress;
  /** the list picked last time, highlighted but never opened automatically */
  lastListId?: string | null;
  onPick: (listId: string) => void;
}

export default function Onderwerp({ lists, progress, lastListId, onPick }: OnderwerpProps) {
  return (
    <main className="onderwerp">
      <h1>Topo Trainer</h1>
      <p className="onderwerp-vraag">Wat wil je oefenen?</p>
      <ul className="onderwerp-lijst">
        {lists.map((l) => {
          const learned = l.items.filter((i) => isMastered(progress, l.id, i.id)).length;
          return (
            <li key={l.id}>
              <button
                className={l.id === lastListId ? 'big onderwerp-knop laatste' : 'big onderwerp-knop'}
                onClick={() => onPick(l.id)}
              >
                <span className="onderwerp-titel">{l.title}</span>
                <span className="onderwerp-voortgang">{learned} van {l.items.length} geleerd</span>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
