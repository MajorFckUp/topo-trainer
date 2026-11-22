import { useState } from 'react';
import type { QuizEntry, Settings } from './data/types';
import { getList, lists } from './data/lists';
import { getMap } from './data/maps';
import { defaultSettingsFor, selectItems } from './logic/selection';
import { weakEntries } from './logic/progress';
import { useProgress } from './logic/useProgress';
import type { Summary } from './logic/quiz';
import Onderwerp from './screens/Onderwerp';
import Home from './screens/Home';
import type { StartKind } from './screens/Home';
import Verkennen from './screens/Verkennen';
import QuizScreen from './screens/QuizScreen';
import Resultaat from './screens/Resultaat';
import Voortgang from './screens/Voortgang';

export type Screen =
  | { name: 'onderwerp' } | { name: 'home' } | { name: 'verkennen' } | { name: 'voortgang' }
  | { name: 'quiz'; entries: QuizEntry[] }
  | { name: 'resultaat'; summary: Summary };

const LAST_LIST_KEY = 'topo-trainer:list';

function readLastListId(): string | null {
  try {
    const id = localStorage.getItem(LAST_LIST_KEY);
    return id && lists.some((l) => l.id === id) ? id : null;
  } catch { return null; }
}

function saveLastListId(id: string): void {
  try { localStorage.setItem(LAST_LIST_KEY, id); } catch { /* silent no-op */ }
}

export default function App() {
  const [listId, setListId] = useState<string>(() => readLastListId() ?? lists[0].id);
  const list = getList(listId);
  const map = getMap(list.mapId);
  const [settings, setSettings] = useState<Settings>(() => defaultSettingsFor(list));
  // the app always opens on the topic screen; the last topic is only highlighted there
  const [lastListId] = useState<string | null>(readLastListId);
  const [screen, setScreen] = useState<Screen>({ name: 'onderwerp' });
  const { progress, record, reset } = useProgress();
  const items = selectItems(list, settings);

  const pick = (id: string) => {
    saveLastListId(id);
    setListId(id);
    setSettings(defaultSettingsFor(getList(id)));
    setScreen({ name: 'home' });
  };

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
    case 'onderwerp':
      return <Onderwerp lists={lists} progress={progress} lastListId={lastListId} onPick={pick} />;
    case 'home':
      return (
        <Home
          list={list}
          settings={settings}
          onSettings={setSettings}
          progress={progress}
          onStart={start}
          onVoortgang={() => setScreen({ name: 'voortgang' })}
          onAnderOnderwerp={() => setScreen({ name: 'onderwerp' })}
        />
      );
    case 'verkennen':
      return <Verkennen list={list} items={items} map={map} onBack={() => setScreen({ name: 'home' })} />;
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
          map={map}
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
