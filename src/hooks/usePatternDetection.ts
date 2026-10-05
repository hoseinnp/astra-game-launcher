import { useState, useEffect } from 'react';
import type { PlayPattern } from '../types/Activity.types';
import { PatternDetectionService } from '../services/PatternDetectionService';

export function usePatternDetection(gameId?: string) {
  const [pattern, setPattern] = useState<PlayPattern | null>(null);

  useEffect(() => {
    const currentHour = new Date().getHours();
    if (gameId) {
      setPattern(PatternDetectionService.detectPlayPattern(gameId, currentHour));
    } else {
      setPattern(PatternDetectionService.findSuggestedResume(currentHour));
    }
  }, [gameId]);

  return { pattern };
}
