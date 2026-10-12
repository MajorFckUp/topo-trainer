import { useState } from 'react';
import type { Category, EuropeMap, TopoItem, TopoList } from '../data/types';
import MapView from '../map/MapView';

export interface VerkennenProps { list: TopoList; items: TopoItem[]; map: EuropeMap; onBack: () => void }

const GROUPS: { id: Category; label: string }[] = [
  { id: 'gebergte', label: 'Gebergten' },
  { id: 'rivier', label: 'Rivieren' },
  { id: 'zee', label: 'Zeeën en zeestraten' },
];

export default function Verkennen({ items, map, onBack }: VerkennenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const highlights = selected ? { [selected.id]: 'selected' as const } : {};

  return (
    <div className="verkennen">
      <div className="verkennen-main">
        <div className="verkennen-bar">
          <button className="big secondary" onClick={onBack}>Terug</button>
          <div className="verkennen-caption" data-testid="verkennen-caption" aria-live="polite">
            {selected ? selected.name : 'Tik op een naam of op de kaart'}
          </div>
        </div>
        <div className="map-area">
          <MapView map={map} items={items} showLabels highlights={highlights} onItemTap={setSelectedId} />
        </div>
      </div>
      <nav className="verkennen-list" aria-label="Onderdelen">
        {GROUPS.map((g) => {
          const group = items.filter((i) => i.category === g.id);
          if (group.length === 0) return null;
          return (
            <section key={g.id}>
              <h2>{g.label}</h2>
              <ul>
                {group.map((i) => (
                  <li key={i.id}>
                    <button
                      className={i.id === selectedId ? 'item selected' : 'item'}
                      aria-pressed={i.id === selectedId}
                      onClick={() => setSelectedId(i.id)}
                    >
                      {i.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </nav>
    </div>
  );
}
