import { useState } from 'react';
import type { QuizEntry, Settings } from './data/types';
import { defaultList } from './data/lists';
import { europeMap } from './data/maps';
import { defaultSettings, selectItems } from './logic/selection';
import { weakEntries } from './logic/progress';
import { useProgress } from './logic/useProgress';
import type { Summary } from './logic/quiz';
import Home from './screens/Home';
import type { StartKind } from './screens/Home';
import Verkennen from './screens/Verkennen';
import QuizScreen from './screens/QuizScreen';
import Resultaat from './screens/Resultaat';
import Voortgang from './screens/Voortgang';

export type Screen =
  | { name: 'home' } | { name: 'verkennen' } | { name: 'voortgang' }
  | { name: 'quiz'; entries: QuizEntry[] }
  | { name: 'resultaat'; summary: Summary };

export default function App() {
  const list = defaultList;
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const { progress, record, reset } = useProgress();
  const items = selectItems(list, settings);

  const start = (k: StartKind) => {
    if (k === 'verkennen') setScreen({ name: 'verkennen' });
    else {
      const entries: QuizEntry[] =
        k === 'fouten' ? weakEntries(progress, list, items) : items.map((i) => ({ itemId: i.id, mode: k }));
      if (entries.length === 0) return;
      setScreen({ name: 'quiz', entries });
    }
  };

  switch (screen.name) {
    case 'home':
      return (
        <Home
          list={list}
          settings={settings}
          onSettings={setSettings}
          progress={progress}
          onStart={start}
          onVoortgang={() => setScreen({ name: 'voortgang' })}
        />
      );
    case 'verkennen':
      return <Verkennen list={list} items={items} map={europeMap} onBack={() => setScreen({ name: 'home' })} />;
    case 'quiz': {
      const quizItems = [...items];
      for (const e of screen.entries) {
        const it = list.items.find((i) => i.id === e.itemId);
        if (it && !quizItems.some((q) => q.id === it.id)) quizItems.push(it);
      }
      return (
        <QuizScreen
          list={list}
          entries={screen.entries}
          items={quizItems}
          map={europeMap}
          onRecord={(e, o) => record(list.id, e.itemId, e.mode, o)}
          onFinish={(summary) => setScreen({ name: 'resultaat', summary })}
          onQuit={() => setScreen({ name: 'home' })}
        />
      );
    }
    case 'resultaat':
      return (
        <Resultaat
          list={list}
          summary={screen.summary}
          onPracticeMistakes={(entries) => {
            if (entries.length > 0) setScreen({ name: 'quiz', entries });
          }}
          onHome={() => setScreen({ name: 'home' })}
        />
      );
    case 'voortgang':
      return <Voortgang list={list} progress={progress} onReset={reset} onBack={() => setScreen({ name: 'home' })} />;
  }
}
