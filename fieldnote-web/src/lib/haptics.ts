/** Sparse, meaningful haptics only — never on every tap. */
export function haptic(kind: 'edit' | 'connect' | 'snap' | 'branch' | 'drop' | 'zoom' | 'confirm' = 'confirm') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const patterns: Record<typeof kind, number | number[]> = {
    edit: [12],
    connect: [10, 40, 14],
    snap: [8],
    branch: [10, 30, 10],
    drop: [16],
    zoom: [6],
    confirm: [18],
  };
  try {
    navigator.vibrate(patterns[kind]);
  } catch {
    /* ignore */
  }
}
