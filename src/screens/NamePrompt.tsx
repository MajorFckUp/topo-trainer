import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import MapView from '../map/MapView';
import type { Highlight } from '../map/MapView';
import { checkAnswer, markMistakes, normalize } from '../logic/spelling';
import type { Segment } from '../logic/spelling';
import type { PromptProps } from './PointPrompt';

const CORRECT_DELAY_MS = 800;
const SHAKE_MS = 400;

type Phase = 'input' | 'correct' | 'almost' | 'typeover' | 'confirmed';

function Segments({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) => (s.wrong ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>))}
    </>
  );
}

export default function NamePrompt({ item, items, map, onDone }: PromptProps) {
  const [phase, setPhase] = useState<Phase>('input');
  const [value, setValue] = useState('');
  const [given, setGiven] = useState('');
  const [shake, setShake] = useState(false);
  const doneRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(shakeTimer.current); }, []);

  useEffect(() => {
    if (phase === 'input' || phase === 'typeover') inputRef.current?.focus();
  }, [phase]);

  const finish = (outcome: 'clean' | 'accepted' | 'miss') => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(outcome);
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (phase !== 'input' && phase !== 'typeover') return;
    if (!normalize(value)) return;
    const result = checkAnswer(value, item);
    if (phase === 'input') {
      setGiven(value);
      if (result === 'correct') {
        setPhase('correct');
        timer.current = setTimeout(() => finish('clean'), CORRECT_DELAY_MS);
      } else if (result === 'almost') {
        setPhase('almost');
      } else {
        setValue('');
        setPhase('typeover');
      }
    } else if (result !== 'wrong') {
      setPhase('confirmed');
      timer.current = setTimeout(() => finish('miss'), CORRECT_DELAY_MS);
    } else {
      setShake(true);
      clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => setShake(false), SHAKE_MS);
    }
  };

  const verder = () => finish('accepted');

  const highlights: Record<string, Highlight> = {
    [item.id]: phase === 'input' ? 'target' : phase === 'typeover' || phase === 'confirmed' ? 'wrong-reveal' : 'correct',
  };

  const marks = phase === 'almost' ? markMistakes(given, item.name) : null;
  const locked = phase === 'correct' || phase === 'almost' || phase === 'confirmed';

  return (
    <div className="prompt" data-testid="prompt" data-item-id={item.id} data-mode="benoemen">
      <form className="prompt-bar" onSubmit={submit}>
        <label className="prompt-text" htmlFor={`naam-${item.id}`}>
          {phase === 'typeover' || phase === 'confirmed' ? 'Typ de naam over' : 'Hoe heet dit?'}
        </label>
        <input
          id={`naam-${item.id}`}
          ref={inputRef}
          className={`name-input${shake ? ' shake' : ''}`}
          type="text"
          aria-label="Naam"
          value={value}
          disabled={locked}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {phase !== 'almost' && <button type="submit" className="big" disabled={locked}>Controleer</button>}
        {phase === 'almost' && (
          <button type="button" className="big" onClick={verder}>Verder</button>
        )}
      </form>
      <div className="name-feedback" aria-live="polite">
        {(phase === 'correct' || phase === 'confirmed') && <span>Goed! <b>{item.name}</b></span>}
        {phase === 'almost' && marks && (
          <>
            <div>Bijna goed!</div>
            <div className="name-compare">
              <div>Jij schreef: <span data-testid="given"><Segments segments={marks.given} /></span></div>
              <div>Het is: <span data-testid="correct"><Segments segments={marks.correct} /></span></div>
            </div>
          </>
        )}
        {phase === 'typeover' && <div>Het goede antwoord is: <b>{item.name}</b></div>}
      </div>
      <div className="map-area">
        <MapView map={map} items={items} highlights={highlights} />
      </div>
    </div>
  );
}
