import { useEffect, useState } from 'react';

/** The current time, refreshed every `intervalMs` while `running` (clocks and countdowns). */
export function useNow(running = true, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    // Catch up straight away when a countdown starts, then keep ticking.
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [running, intervalMs]);
  return now;
}
