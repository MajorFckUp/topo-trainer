import { useEffect, useRef, useState } from 'react';
import type { EuropeMap, Outcome, TopoItem } from '../data/types';
import MapView from '../map/MapView';
import type { Highlight } from '../map/MapView';

export interface PromptProps { item: TopoItem; items: TopoItem[]; map: EuropeMap; onDone: (outcome: Outcome) => void }

const CORRECT_DELAY_MS = 800;

export default function PointPrompt({ item, items, map, onDone }: PromptProps) {
  const [tapped, setTapped] = useState<TopoItem | null>(null);
  const [correct, setCorrect] = useState(false);
  const doneRef = useRef(false);
  const finished = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onItemTap = (id: string, candidates: string[] = [id]) => {
    if (doneRef.current) return;
    doneRef.current = true;
    // forgiving by design: any item under the finger counts, because river hit bands overlap neighbours
    if (candidates.includes(item.id)) {
      setCorrect(true);
      timer.current = setTimeout(() => onDone('clean'), CORRECT_DELAY_MS);
    } else {
      setTapped(items.find((i) => i.id === id) ?? null);
    }
  };

  const verder = () => {
    if (finished.current) return;
    finished.current = true;
    onDone('miss');
  };

  const highlights: Record<string, Highlight> = {};
  if (correct) highlights[item.id] = 'correct';
  else if (tapped) {
    highlights[tapped.id] = 'wrong';
    highlights[item.id] = 'wrong-reveal';
  }

  return (
    <div className="prompt" data-testid="prompt" data-item-id={item.id} data-mode="aanwijzen">
      <div className="prompt-bar">
        <div className="prompt-text">Wijs <b>{item.name}</b> aan</div>
        {tapped && (
          <>
            <div className="prompt-feedback" aria-live="polite">Dat was {tapped.name}. Dit is {item.name}.</div>
            <button className="big" onClick={verder}>Verder</button>
          </>
        )}
      </div>
      <div className="map-area">
        <MapView map={map} items={items} highlights={highlights} onItemTap={onItemTap} />
      </div>
    </div>
  );
}
