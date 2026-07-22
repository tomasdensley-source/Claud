# Fieldnote Android Expo Blueprint

**Authoritative specification** — Mobile-first infinite canvas for spatial thinking (Android primary).  
Source: Fieldnote Android Expo React Native App Blueprint (Cursor).  
**Execution contract:** `docs/COMBINED_PLAN.md` (v1.5.0).

## Recommended stack
Skia + Reanimated · Gesture Handler · expo-haptics · expo-sqlite + FileSystem · JSON Canvas · image/document pickers · Share Sheet · Hermes.

## Camera / zoom architecture
- `screen = world * scale + translate` (top-left origin)
- Fixed viewport gesture plane; world layer transforms only
- Pinch owns scale + translate about **start focal** (no pan/pinch fight)
- **Default:** one-finger pan; Multi ON → marquee + two-finger pan
- Range **0.01×–80×** with elastic rubber-band + spring snap-back
- Pan momentum (`withDecay`)
- Camera math is worklet-safe (pinch must not call plain JS on UI thread)
- No world-sized SVG/Skia surfaces (Android “bitmap too large” on zoom)

## Implementation status

### 1. Gesture & navigation
- [x] Default one-finger pan (map-like)
- [x] Multi opt-in → marquee; two-finger pan
- [x] Pinch zoom without sideways drift
- [x] One-finger object = manipulate
- [x] Long-press empty → compact 3-button add
- [x] Soft haptics + Reduce Motion mute
- [x] Infinite zoom + focal pinch + pan momentum
- [x] Draw: one-finger ink; two-finger nav
- [x] Lasso freehand selection
- [x] Live alignment guides on drag
- [x] Lock selected (no drag/resize)
- [ ] Multi-touch nav while actively dragging a connector endpoint

### 2. UI polish
- [x] Vertical folded color palette + frame/body toggle
- [x] Top toasts with Undo
- [x] Selection count badge in multi toolbar
- [x] Compact contextual add menu (+ in-place submenus)
- [x] Panel placement helpers (ChromeLayoutProvider)
- [x] Compact text-formatting panel (progressive)
- [x] FloatingActionSheet (no routine center Alerts)
- [x] Edge ModalShell variant
- [x] Mind-map contextual toolbar
- [x] Landmark zoom persistence (SQLite)

### 3. Objects
- [x] Markdown-formatted text cards
- [x] Task 3s progressive glow hold-complete + water-flow
- [x] Mind-map collapse / depth / tidy (no manual resize)
- [x] Colored regions + zoom-into background takeover
- [x] Drawing layer + stroke hold-edit
- [x] Connector color/thickness hold-edit
- [x] Box resize handles (not mindmap/drawing)
- [x] PDF cover cards + in-app WebView reader
- [x] Snap-to-grid on object drop
- [x] Graph hygiene on delete/duplicate/import

### 4. Data & Android
- [x] SQLite dual-write + AsyncStorage migrate
- [x] JSON Canvas import/export + Paste AI Board (+ metadata.fieldnote)
- [x] Multi-board duplicate/archive/recents
- [x] Landmarks / Places (+ zoom)
- [x] Region Markdown /.canvas export
- [ ] Region PNG/PDF/ZIP export
- [ ] Voice dictation capture
- [ ] Full a11y audit

### 5. Quality
- [x] Centralized soft haptics
- [ ] Full Skia scene graph
- [ ] Large-canvas virtualization
- [ ] Full Android verification matrix
