import type { Category, Settings, TopoList } from '../data/types';
import type { Progress } from '../logic/progress';
import { weakEntries } from '../logic/progress';
import { selectItems } from '../logic/selection';

export type StartKind = 'verkennen' | 'aanwijzen' | 'benoemen' | 'fouten';
export interface HomeProps {
  list: TopoList;
  settings: Settings;
  onSettings: (s: Settings) => void;
  progress: Progress;
  onStart: (k: StartKind) => void;
  onVoortgang: () => void;
}

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'gebergte', label: 'Gebergten' },
  { id: 'rivier', label: 'Rivieren' },
  { id: 'zee', label: 'Zeeën en zeestraten' },
];

export default function Home({ list, settings, onSettings, progress, onStart, onVoortgang }: HomeProps) {
  const items = selectItems(list, settings);
  const empty = items.length === 0;
  const noWeak = weakEntries(progress, list, items).length === 0;

  const toggleCategory = (id: Category) => {
    const categories = CATEGORIES.map((c) => c.id).filter((c) =>
      c === id ? !settings.categories.includes(c) : settings.categories.includes(c),
    );
    onSettings({ ...settings, categories });
  };

  return (
    <main className="home">
      <h1>Topo Trainer</h1>
      <section className="home-settings" aria-label="Wat wil je oefenen?">
        {CATEGORIES.map((c) => (
          <label key={c.id} className="check">
            <input type="checkbox" checked={settings.categories.includes(c.id)} onChange={() => toggleCategory(c.id)} />
            {c.label}
          </label>
        ))}
        <label className="check">
          <input type="checkbox" checked={settings.plus} onChange={() => onSettings({ ...settings, plus: !settings.plus })} />
          Plus
        </label>
        {empty && <p className="hint">Kies minstens één onderdeel.</p>}
      </section>
      <section className="home-actions">
        <button className="big" disabled={empty} onClick={() => onStart('verkennen')}>Verkennen</button>
        <button className="big" disabled={empty} onClick={() => onStart('aanwijzen')}>Aanwijzen</button>
        <button className="big" disabled={empty} onClick={() => onStart('benoemen')}>Benoemen</button>
        <div className="fouten">
          <button className="big" disabled={noWeak} onClick={() => onStart('fouten')}>Oefen mijn fouten</button>
          {noWeak && !empty && <span className="hint">Alles geleerd — goed gedaan!</span>}
        </div>
        <button className="big secondary" onClick={onVoortgang}>Voortgang</button>
      </section>
    </main>
  );
}
