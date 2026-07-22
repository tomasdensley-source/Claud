# Fieldnote — Android Expo React Native App (Cursor Prompt)

Authoritative product prompt stored for agent continuity.
See `BLUEPRINT.md` for implementation status.

## Camera / zoom architecture (implemented)

1. **Model** — `screen = world * scale + translate`, top-left origin.
2. **Layers** — Fixed viewport gesture plane; animated world layer with static `transformOrigin: 'top left'`.
3. **Priority** — Two-finger pan+pinch always wins over object gestures.
4. **Pinch** — Focal-point zoom; `softClampScale` rubber-band past 0.01×–80×; `withSpring` snap-back.
5. **Pan** — Two-finger averageTouches + `withDecay` momentum.
6. **Buttons / Fit** — Share `clampScale` / `zoomAboutFocal` helpers.

## Task hold architecture (implemented)

1. `Exclusive(taskHold, drag, tap)` — hold wins over drag.
2. Drag min-distance raised on tasks (18px) so jitter does not cancel.
3. LongPress 3000ms / maxDistance 36 — `onBegin` starts progressive glow; `onStart` completes.
4. Continuous amber→green glow + elevation; heavy+success haptic “pop” on complete.
5. Water-flow gating unchanged (`canCompleteTask` + glowing connectors).
