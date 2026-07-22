# Fieldnote improvements — v1.6.3 (Pinch zoom hard-fix)

## Critical
**Pinch zoom was unusable** because `Simultaneous(pinch, twoFingerPan)` raced for `tx`/`ty`. Pinch is now the **sole two-finger camera writer**; focal drift handles pan-while-zoom. Worklet-safe finite checks; cancel decay on pinch start; no spring jump on clamp.

## 1.6.2
Finish Line: water-flow, collision slots, soft MD/PDF, tablet sheets, nested regions.

## 1.6.1
Launch fix (`expo-av` → `expo-audio`) + What’s New.

## Prior
1.5.x–1.6.0 Combined Plan inventory.
