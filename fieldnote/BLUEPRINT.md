# Fieldnote Android Expo Blueprint

**Authoritative specification** — Mobile-first infinite canvas for spatial thinking (Android primary).  
Source: Fieldnote Android Expo React Native App Blueprint (Cursor).

## Recommended stack
Skia + Reanimated · Gesture Handler · expo-haptics · expo-sqlite + FileSystem · JSON Canvas · image/document pickers · Share Sheet · Hermes.

## Camera / zoom architecture
- `screen = world * scale + translate` (top-left origin)
- Fixed viewport gesture plane; world layer transforms only
- Two-finger pan+pinch **always** wins
- Range **0.01×–80×** with elastic rubber-band + spring snap-back
- Two-finger pan momentum (`withDecay`)
- Camera math is worklet-safe (pinch must not call plain JS on UI thread)
- No world-sized SVG/Skia surfaces (Android “bitmap too large” on zoom)

## Implementation status

### 1. Gesture & navigation
- [x] Two-finger always pan/pinch
- [x] One-finger empty = marquee
- [x] One-finger object = manipulate
- [x] Long-press empty → compact 3-button add
- [x] Soft haptics + Reduce Motion mute
- [x] Infinite zoom + focal pinch + pan momentum
- [ ] Multi-touch nav while actively dragging a connector endpoint
- [ ] Lasso selection (marquee covers rect selection)

### 2. UI polish
- [x] Vertical folded color palette + frame/body toggle
- [x] Top toasts with Undo
- [x] Selection count badge in multi toolbar
- [x] Compact contextual add menu
- [x] Panel placement helpers (shared engine)
- [x] Compact text-formatting panel (selected text/task)
- [x] Snap-to-grid on object drop
- [x] Mind-map nodes: no manual resize handles
- [x] Connector color/thickness hold-edit (midpoint long-press)
- [x] Full collision application to every chrome piece every frame
- [x] Keyboard-aware text-format reposition
- [x] Compact text-formatting panel (selected text/task)
- [x] Snap-to-grid on object drop
- [x] Mind-map nodes: no manual resize handles
- [x] Connector color/thickness hold-edit (midpoint long-press)
- [x] Landmark zoom persistence (SQLite)
- [x] Graph hygiene on delete/duplicate/import
- [ ] Region PNG/PDF/ZIP export
- [ ] Voice dictation capture
- [ ] Full a11y audit
- [ ] Lasso selection (marquee covers rect selection)
- [ ] Multi-touch nav while actively dragging a connector endpoint
- [ ] Full Skia scene graph
- [ ] Large-canvas virtualization
- [ ] Full Android verification matrix