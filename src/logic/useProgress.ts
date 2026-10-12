import { useCallback, useState } from 'react';
import type { Mode, Outcome } from '../data/types';
import { clearProgress, emptyProgress, loadProgress, recordAnswer, saveProgress } from './progress';
import type { Progress } from './progress';

export function useProgress(): {
  progress: Progress;
  record: (listId: string, itemId: string, mode: Mode, outcome: Outcome) => void;
  reset: () => void;
} {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());

  const record = useCallback((listId: string, itemId: string, mode: Mode, outcome: Outcome) => {
    setProgress((cur) => {
      const next = recordAnswer(cur, listId, itemId, mode, outcome);
      saveProgress(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    clearProgress();
    setProgress(emptyProgress());
  }, []);

  return { progress, record, reset };
}
