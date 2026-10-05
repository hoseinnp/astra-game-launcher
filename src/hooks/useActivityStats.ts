import { useState, useEffect } from 'react';
import type { GameSession, OverallStats } from '../types/Activity.types';
import { ActivityTrackingService } from '../services/ActivityTrackingService';

export function useActivityStats() {
  const [sessions, setSessions] = useState<GameSession[]>(ActivityTrackingService.getAllSessions());
  const [stats, setStats] = useState<OverallStats>(ActivityTrackingService.getOverallStats());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    ActivityTrackingService.syncWithBackend().then((list) => {
      if (mounted) {
        setSessions(list);
        setStats(ActivityTrackingService.getOverallStats());
        setIsLoading(false);
      }
    });

    const unsubscribe = ActivityTrackingService.subscribe((updatedSessions) => {
      if (mounted) {
        setSessions(updatedSessions);
        setStats(ActivityTrackingService.getOverallStats());
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return {
    sessions,
    stats,
    isLoading,
    refresh: () => {
      ActivityTrackingService.syncWithBackend().then((list) => {
        setSessions(list);
        setStats(ActivityTrackingService.getOverallStats());
      });
    }
  };
}
