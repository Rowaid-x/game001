import React, { useEffect } from 'react';

export default function CelebrationOverlay() {
  useEffect(() => {
    let confetti;
    import('canvas-confetti').then((mod) => {
      confetti = mod.default;
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }).catch(() => {});

    return () => {
      // confetti auto-cleans
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true" />
  );
}
