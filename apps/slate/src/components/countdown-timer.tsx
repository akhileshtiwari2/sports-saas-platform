'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  target: Date;
  className?: string;
}

export function CountdownTimer({ target, className = '' }: CountdownTimerProps) {
  const [diff, setDiff] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      let ms = target.getTime() - now.getTime();
      if (ms <= 0) {
        setDiff({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      const d = Math.floor(ms / 86400000);
      ms %= 86400000;
      const h = Math.floor(ms / 3600000);
      ms %= 3600000;
      const m = Math.floor(ms / 60000);
      ms %= 60000;
      const s = Math.floor(ms / 1000);
      setDiff({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const parts = [];
  if (diff.d > 0) parts.push(`${diff.d}d`);
  parts.push(`${String(diff.h).padStart(2, '0')}:${String(diff.m).padStart(2, '0')}:${String(diff.s).padStart(2, '0')}`);

  return (
    <span className={className}>
      {parts.join(' ')}
    </span>
  );
}
