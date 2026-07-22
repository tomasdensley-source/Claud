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
- [x] JSON Canvas 1.0 import/export (+ Paste AI Board)

### Priority 3 — Color system
- [x] Vertical palette beside toolbar, folded by default
- [x] Frame vs body color toggle
- [x] Persistent custom swatches in storage

### Priority 4 — Floating panels
- [x] Shared panel placement / collision helpers
- [x] Top toasts with Undo + dismiss
- [x] Selection count badge in multi toolbar
- [ ] Full collision engine for every floating chrome piece

### Priority 5 — Tasks + water-flow
- [x] 3-second progressive glow hold-to-complete
- [x] Dependency gating + glowing connectors

### Priority 6 — Mind maps
- [x] Collapse control + descendant counts
- [x] Visible-depth selector
- [x] Tidy selected root

### Priority 7 — Regions
- [x] parentId assignment / nested containment helpers
- [ ] Zoom-into-region background takeover camera mode

### Priority 8–11
Drawing stroke hold-edit, multi-board home thumbnails, landmarks,
region export PNG/PDF, SQLite, a11y, full verification.
