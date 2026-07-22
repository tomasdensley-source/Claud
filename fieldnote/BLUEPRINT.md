/**
 * Fieldnote Android Expo Blueprint
 *
 * Authoritative source: Cursor Prompt — Fieldnote Android Expo React Native App.
 * Android-primary infinite canvas for spatial thinking, mind maps, water-flow tasks,
 * nested regions, Markdown notes, and PDF cards.
 */

## Camera / zoom architecture

- Model: `screen = world * scale + translate` with top-left origin.
- Gesture plane is fixed (viewport); only the world layer transforms.
- Two-finger pan + pinch always win (even over objects).
- Pinch zooms about the focal point; soft rubber-band past 0.01×–80×; spring-back on release.
- Two-finger pan uses velocity decay (momentum).
- Soft clamps exist only to avoid float blow-ups.

## Implementation status

### Priority 1 — Gesture + canvas foundation
- [x] Two-finger navigation always (pan + pinch)
- [x] One-finger empty = marquee
- [x] One-finger object = manipulate
- [x] Long-press empty → compact 3-button contextual add
- [x] Soft haptics (respects Reduce Motion)
- [x] Near-infinite zoom (0.01×–80×) + elastic limits + pan momentum
- [x] Skia live-stroke path (SVG fallback)
- [ ] Full Skia scene graph for all object types

### Priority 2 — Object model + JSON Canvas
- [x] Connectors, dependsOn, locked, parentId, markdown
- [x] SQLite dual-write + AsyncStorage migrate
- [x] JSON Canvas 1.0 import/export + Paste AI Board
- [x] Formatted Markdown rendering

### Priority 3 — Color system
- [x] Vertical palette, folded by default
- [x] Frame vs body toggle
- [x] Custom swatches

### Priority 4 — Floating panels
- [x] Panel placement helpers + top toasts + selection badge
- [ ] Full collision engine for every chrome piece

### Priority 5 — Tasks + water-flow
- [x] 3s progressive glow hold-to-complete + haptics
- [x] Dependency gating + glowing connectors

### Priority 6 — Mind maps
- [x] Collapse + depth + tidy

### Priority 7 — Regions
- [x] parentId helpers + zoom-into-region background mode

### Priority 8–11
- [x] Stroke hold-edit, multi-board, landmarks, region MD/.canvas export, resize handles, haptics
- [ ] PDF render inside cards
- [ ] Region PNG/PDF export
- [ ] Full visual HIG polish pass
- [ ] Full Android verification
