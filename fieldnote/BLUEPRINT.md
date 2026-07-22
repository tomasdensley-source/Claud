# Fieldnote Android Expo Blueprint

Authoritative specification for the Android-primary Expo Fieldnote app.
Source: product blueprint (gesture priority, Skia canvas, spatial objects, JSON Canvas, Android capture).

## Implementation status (tracked)

### Priority 1 — Gesture + canvas foundation
- [x] Explicit two-finger navigation always (pan + pinch)
- [x] One-finger empty = marquee selection
- [x] One-finger object = manipulate
- [x] Long-press empty → compact 3-button contextual add
- [x] Soft haptics wrapper (respects availability)
- [x] Skia dependency installed (drawing overlay path)
- [ ] Full Skia scene graph for all object types

### Priority 2 — Object model + JSON Canvas
- [x] Expanded types: connectors, dependsOn, locked, parentId, markdown
- [ ] SQLite persistence layer
- [ ] JSON Canvas 1.0 import/export

### Priority 3 — Color system
- [x] Vertical palette beside toolbar, folded by default
- [x] Frame vs body color toggle
- [ ] Persistent custom swatches in storage

### Priority 4 — Floating panels
- [x] Shared panel placement / collision helpers
- [x] Top toasts with Undo + dismiss
- [ ] Full collision engine for every floating chrome piece

### Remaining priorities (5–11)
Task water-flow, mind-map engine, region nesting, connectors editing,
multi-board home, recovery snapshots, Paste AI Board, a11y polish.
