import { useEffect, useRef, useState } from 'react';
import type { EuropeMap, Outcome, QuizEntry, TopoItem, TopoList } from '../data/types';
import { createRound, current, hasMistake, isDone, resolve, summarize } from '../logic/quiz';
import type { Summary } from '../logic/quiz';
import PointPrompt from './PointPrompt';
import NamePrompt from './NamePrompt';

export interface QuizScreenProps {
  list: TopoList;
  entries: QuizEntry[];
  items: TopoItem[];
  map: EuropeMap;
  onRecord: (entry: QuizEntry, outcome: Outcome) => void;
  onFinish: (summary: Summary) => void;
  onQuit: () => void;
}

export default function QuizScreen({ entries, items, map, onRecord, onFinish, onQuit }: QuizScreenProps) {
  const [state, setState] = useState(() => createRound(entries));
  const [attempt, setAttempt] = useState(0);
  const finished = useRef(false);
  const entry = current(state);
  const item = entry ? items.find((i) => i.id === entry.itemId) : undefined;

  const finish = (summary: Summary) => {
    if (finished.current) return;
    finished.current = true;
    onFinish(summary);
  };

  useEffect(() => {
    if (isDone(state)) finish(summarize(state));
  });

  const onDone = (outcome: Outcome) => {
    if (!entry) return;
    if (!hasMistake(state, entry)) onRecord(entry, outcome);
    setState(resolve(state, outcome !== 'miss'));
    setAttempt((a) => a + 1);
  };

  const done = state.total - new Set(state.queue.map((e) => `${e.mode}:${e.itemId}`)).size;

  return (
    <div className="quiz">
      <div className="quiz-bar">
        <div className="quiz-progress" data-testid="progress">{done} van {state.total}</div>
        <button className="big secondary" onClick={onQuit}>Stop</button>
      </div>
      {entry && item && entry.mode === 'aanwijzen' && (
        <PointPrompt
          key={`${entry.mode}:${entry.itemId}:${attempt}`}
          item={item}
          items={items}
          map={map}
          onDone={onDone}
        />
      )}
      {entry && item && entry.mode === 'benoemen' && (
        <NamePrompt
          key={`${entry.mode}:${entry.itemId}:${attempt}`}
          item={item}
          items={items}
          map={map}
          onDone={onDone}
        />
      )}
    </div>
  );
}
