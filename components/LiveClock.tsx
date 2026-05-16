"use client";

import { useState, useEffect } from 'react';

export function LiveClock() {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return <div style={{ height: '50px' }}></div>; // Placeholder

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
        {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div style={{ fontSize: '0.85rem', fontWeight: 500, textTransform: 'capitalize' }}>
        {time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}
