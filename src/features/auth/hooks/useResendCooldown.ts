import { useEffect, useState } from 'react';

import { RESEND_COOLDOWN_SEC } from '../constants';

/** Seconds left before another code may be sent, counting down from `sentAt`. */
export function useResendCooldown(sentAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (sentAt === null) return 0;
  return Math.max(0, RESEND_COOLDOWN_SEC - Math.floor((now - sentAt) / 1000));
}
