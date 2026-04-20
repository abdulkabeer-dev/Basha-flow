import { useState, useEffect, useCallback } from 'react';

export const MAX_RPM = 15;
export const MAX_RPD = 1500;

export function useQuota() {
  const [rpmHistory, setRpmHistory] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem('GEMINI_RPM_HISTORY');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [rpdData, setRpdData] = useState<{ date: string; count: number }>(() => {
    const today = new Date().toDateString();
    try {
      const stored = localStorage.getItem('GEMINI_RPD_DATA');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) return parsed;
      }
    } catch { /* ignore */ }
    return { date: today, count: 0 };
  });

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter history to last 60 seconds
  const activeRpm = rpmHistory.filter(ts => now - ts < 60000);

  const recordRequest = useCallback(() => {
    const timestamp = Date.now();
    setRpmHistory(prev => {
      const updated = [...prev.filter(ts => timestamp - ts < 60000), timestamp];
      localStorage.setItem('GEMINI_RPM_HISTORY', JSON.stringify(updated));
      return updated;
    });

    setRpdData(prev => {
      const today = new Date().toDateString();
      const updated = {
        date: today,
        count: prev.date === today ? prev.count + 1 : 1
      };
      localStorage.setItem('GEMINI_RPD_DATA', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isRpmLimited = activeRpm.length >= MAX_RPM;
  const isRpdLimited = rpdData.count >= MAX_RPD;
  const rpmCount = activeRpm.length;
  const rpdCount = rpdData.count;

  return {
    rpmCount,
    rpdCount,
    isRpmLimited,
    isRpdLimited,
    recordRequest,
    MAX_RPM,
    MAX_RPD
  };
}
