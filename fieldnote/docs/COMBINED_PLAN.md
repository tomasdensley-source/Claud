# Fieldnote 1.5.0 — Combined Plan (v2)

> Living execution document. State lives in git + this file. Update checkboxes and
> the decision log as each batch lands.

## 0. Purpose & how to read this

This is the single source of truth for shipping **Fieldnote 1.5.0** — the
"maximum-premium" release. It maps every known bug and every promised feature to a
numbered batch, sketches the TypeScript APIs for the core systems, gives a per-file
change map, and defines what "done" means.

Another senior engineer should be able to pick up any batch and execute it from this
document with almost no additional context.

### Current baseline (as of this plan)

- **Stack:** Expo `~57`, React Native `0.86`, React `19.2`, `react-native-reanimated`
  `4.5`, `react-native-gesture-handler` `2.32`, `react-native-svg` `15.15`. Drawing/
  rendering today is **SVG-based**, not Skia.
- **Size:** ~2,000 LOC across `App.tsx` + `src/**`. Clean, typed, `tsc --noEmit`
  passes, `npm test` (seed smoke tests) passes.
- **Architecture:** single `BoardContext` store (boards, selection, history,
  persistence via AsyncStorage) → `InfiniteCanvas` (gesture + transform) →
  `CanvasItemView` (per-item renderer) + floating `Toolbar`/`ZoomControls`/`Minimap`
  + modal `panels/*`.

### Environment constraints (honest scope)

This plan is executed from a headless CI-style sandbox. Some Definition-of-Done items
in the original brief **cannot be verified here** and are called out explicitly so we
never report them as done when they aren't:

- ❌ **No Android emulator/device** — per-batch "manual verification on device" is not
  possible in-sandbox. Every batch is instead gated on `tsc --noEmit && npm test` plus
  code-level review. Device QA is a human step, tracked in §7.
- ❌ **EAS preview build + install links** — requires interactive Expo auth; runs from a
  developer machine or CI with `EXPO_TOKEN`, not here. The GitHub Actions workflow
  (`.github/workflows/fieldnote-build.yml`) already builds a debug APK on push; EAS is
  a follow-up.
- ⚠️ **Skia** — not currently a dependency. Batch 8 (drawing) either adds
  `@shopify/react-native-skia` (a real dependency + native-build change) or keeps the
  existing SVG path renderer. Default: keep SVG unless Skia is explicitly greenlit,
  because SVG is verifiable in this environment and Skia's benefits (pressure, perf)
  can't be validated without a device.

Because of the above, batches are landed **incrementally as reviewable, type-checked
PRs** rather than one monolithic "verified 1.5.0" drop. That is the maintainable path.

---

## 1. Bug inventory → batch map

| # | Bug | Batch | Notes |
|---|-----|-------|-------|
| 1 | Zoom unreliable / limited / crashes | **0** | Widen to 0.01–50x, stable focal clamp, momentum |
| 2 | Drawing tool broken/inconsistent | 8 | Reliable path capture; Skia optional |
| 3 | Task 3s glow + hold-to-complete broken | 6 | Progressive glow + haptic state machine |
| 4 | Cards not user-resizable with handles | 6 | 4 sides + 4 corners handles |
| 5 | Markdown not rendered as rich text | 6 | Lightweight MD → RN renderer |
| 6 | PDFs don't render in cards | 10 | First-page cover + page render |
| 7 | Visual design unfinished/inconsistent | 3, 5, 12 | Design tokens + polish passes |
| 8 | Haptics missing/weak | 4, 12 | Central `haptics` module |
| 9 | Gesture priority flaky (2-finger nav) | **0**, 4 | 2-finger always wins |
| 10 | Floating panels overlap/clip | 3, 5 | Collision-avoidance placement engine |
| 11 | Palette not default-closed / no persist / no frame-body toggle | 2 | Vertical palette, 5 slots |
| 12 | Task dependency water-flow broken | 6 | Glowing arrows + blocking logic |
| 13 | Mind-map collapse/depth/Tidy incomplete | 7 | Branch +/- , depth, Tidy, subtree move |
| 14 | Region boxes don't become background layers | 7 | Nestable section layers |
| 15 | Connector color/thickness long-press edit missing | 8 | Long-press connector editor |
| 16 | Add menu not compact 3-button | 4 | From tree / From device / Add New |
| 17 | Notifications centered/obtrusive | 3 | Top, compact, auto-dismiss + Undo |
| 18 | Large MD/PDF lag/crash | 10 | Chunked load + caching |
| 19 | AI boards glitch (coords/structure) | 1, 7 | Normalize + one-tap Repair |
| 20 | Feels "accumulated" not deliberate | 12 | Final premium pass |

---

## 2. Feature inventory → batch map

- Audio cards + multi-track playlists — **9**
- Folder tree / working directories + batch upload routing — **9**
- Long-press empty canvas → 3-button add menu — **4**
- PDF first-page cover + full render — **10**
- Movable floating toolbar (grip, edge snap, remembered position) — **3**
- Extreme-zoom mind-map visibility + coordinate normalization + Repair Map — **1, 7**
- Formatted Markdown in text/task cards — **6**
- User-resizable cards (handles all sides/corners) — **6**
- Task cards: 3s progressive glow + haptic completion (incomplete + unblocked only) — **6**
- Water-flow dependency system (glowing arrows unlock dependents) — **6**
- Colored region boxes as nestable background layers — **7**
- Mind-map: branch +/- with counts, global depth, Tidy, subtree move, inherited color — **7**
- Connector long-press editing (color, thickness) — **8**
- Vertical palette (default closed, 5 persistent slots, frame vs body toggle) — **2**
- Compact top auto-dismiss notifications with Undo — **3**
- ~500ms hold-to-edit on text/task with haptics — **4**
- Strict gesture contract preserved — **0, 4**
- JSON Canvas 1.0 + `metadata.fieldnote` lossless round-trip — **1**
- Multi-board home, recovery snapshots, global search + landmarks, region export,
  Paste AI Board importer — **11**
- Alignment snapping + edge-panning while dragging — **4**
- Double-tap empty canvas → new text note — **8**
- 50-improvement reliability pass (multi-tab protection, storage alerts, smarter
  Escape, undo grouping, keyboard nav) — **11**

---

## 3. Core system API sketches

### 3.1 Canvas transform & gestures (Batch 0)

```ts
// Scale bounds (world units → screen). Wide range, clamped for stability.
export const MIN_SCALE = 0.01;
export const MAX_SCALE = 50;
export function clampScale(s: number): number; // 'worklet'

// Camera: single source of truth in shared values.
//   scale, tx, ty   — transform: translate(tx,ty) scale(scale), origin 0,0
//   screenToWorld(x,y) = ((x - tx)/scale, (y - ty)/scale)
//   worldToScreen(x,y) = (x*scale + tx, y*scale + ty)

// Gesture contract (priority high → low):
//   1. Two-finger pan + pinch (navigation) — ALWAYS wins.
//   2. Draw (tool==='draw', single finger).
//   3. Item drag (single finger, when selection present & started on item).
//   4. Background tap (clear) / long-press (add menu) / double-tap (new note).
// Rule: any gesture seeing >=2 active touches yields to navigation.
```

### 3.2 Data model additions (Batch 1)

```ts
interface TaskItem {
  // ...existing
  dependsOn?: string[];   // ids of tasks that must be done first (water-flow)
}
interface RegionItem {
  parentId?: string;      // nesting → background layers
  layer?: number;
}
interface MindMapItem {
  collapsed?: boolean;
  depth?: number;
  branchColor?: string;
}
interface EdgeItem {      // connectors as first-class edges
  id: string; type: 'edge';
  from: string; to: string;
  color?: string; width?: number; flow?: boolean;
}
// JSON Canvas 1.0: nodes[] + edges[]; Fieldnote extras under
// node.metadata.fieldnote and edge.metadata.fieldnote for lossless round-trip.
```

### 3.3 Color system (Batch 2)

```ts
interface PaletteState {
  open: boolean;                 // default false
  target: 'frame' | 'body';      // frame = border/background, body = text
  customSlots: string[];         // >=5 persisted hex slots
}
```

### 3.4 Floating UI + notifications (Batch 3)

```ts
type Anchor = 'top' | 'bottom' | 'left' | 'right';
function placePanel(desired: Rect, occupied: Rect[], safe: Insets): Rect; // collision avoidance
interface Toast { id: string; text: string; undo?: () => void; ttl: number; }
```

### 3.5 Haptics (Batch 4)

```ts
// Thin wrapper; respects reduce-motion / disabled setting.
export const haptics = {
  light(): void; medium(): void; heavy(): void; success(): void; warning(): void;
};
```

---

## 4. Per-file change map (by batch)

- **Batch 0** — `src/components/InfiniteCanvas.tsx` (scale bounds, focal clamp,
  momentum, 2-finger priority); `src/lib/camera.ts` (new: clamp + coord helpers);
  `src/components/ZoomControls.tsx` (respect new bounds).
- **Batch 1** — `src/types.ts` (deps/layers/edges); `src/lib/jsoncanvas.ts` (new,
  import/export); `src/lib/normalize.ts` (new, AI-board repair); `src/store/BoardContext.tsx`.
- **Batch 2** — `src/components/Palette.tsx` (new); `src/store/BoardContext.tsx`
  (palette state + persistence); `src/theme.ts`.
- **Batch 3** — `src/lib/placement.ts` (new); `src/components/Toast.tsx` (new);
  `src/components/Toolbar.tsx` (movable/grip/snap); `App.tsx`.
- **Batch 4** — `src/lib/haptics.ts` (new); `src/components/InfiniteCanvas.tsx`
  (hold-to-edit, snapping, edge-pan); `src/components/panels/AddPanel.tsx` (3-button).
- **Batch 5** — `App.tsx` (edge-to-edge, safe-area, keyboard-aware); panels stacking.
- **Batch 6** — `src/components/CanvasItemView.tsx` (resize handles, MD, task glow);
  `src/lib/markdown.ts` (new); `src/components/TaskGlow.tsx` (new); edges water-flow.
- **Batch 7** — `src/components/MindMap*.tsx`; `src/components/Region*.tsx`.
- **Batch 8** — `src/components/DrawingLayer.tsx`; connector editor; double-tap note.
- **Batch 9** — audio/playlist cards; `src/components/panels/FilesPanel.tsx` folder tree.
- **Batch 10** — PDF render + cover cache; large-file chunking.
- **Batch 11** — multi-board home, snapshots, search/landmarks, export, AI import.
- **Batch 12** — polish, haptics coverage, perf, final verification.

---

## 5. Disclosure modes (chrome/slot diagram)

```
 ┌───────────────────────────── viewport ─────────────────────────────┐
 │ [toast area — top center, compact, auto-dismiss]                    │
 │                                                                     │
 │  ▉ palette (left, folded by default)          minimap (hidden while │
 │  ▉                                             editing) ───────────┐ │
 │                                                                  ▢ │ │
 │                         C A N V A S                              ▢ │ │
 │                                                                  ▢ │ │
 │                                                                    │ │
 │            ┌──────── movable toolbar (grip ⣿) ────────┐            │
 │            │ +  Boards  Files  Multi  Draw  Find  More │  [zoom −/+]│
 │            └───────────────────────────────────────────┘           │
 └─────────────────────────────────────────────────────────────────────┘
```

Stacking rule: only one modal panel at a time; palette + toolbar + zoom are
persistent chrome and must never overlap (placement engine, Batch 3).

---

## 6. Minimum-cut 1.5.0 vs full premium scope

| Capability | Min-cut (ship-blocking) | Full premium |
|---|---|---|
| Zoom | Stable 0.05–20x, no crash | 0.01–50x + momentum + double-tap |
| Gestures | 2-finger nav wins; item drag; tap/long-press | + snapping, edge-pan, hold-to-edit |
| Cards | Text/task/image render; edit | + resize handles, MD, PDF, audio |
| Tasks | Toggle done | + 3s glow, haptic, water-flow deps |
| Mind map | Render + edit text | + collapse/depth/Tidy/subtree |
| Regions | Colored box | + nestable background layers |
| Palette | Pick color | + folded default, slots, frame/body |
| Panels | Open/close | + collision engine, movable toolbar |
| Persistence | Autosave boards | + snapshots, JSON Canvas round-trip |
| Notifications | none breaking | top compact + Undo |

Min-cut is the release gate; premium items are additive and land where verifiable.

---

## 7. Android QA checklist (human step — cannot run in sandbox)

- [ ] Cold start clean; initial fit centers seed board.
- [ ] Pinch zoom smooth 0.01↔50x; focal point stays under fingers; no crash at extremes.
- [ ] Two-finger pan/pinch always wins, even with an item selected / mid-drag.
- [ ] Single-finger drag moves selected item only when started on it.
- [ ] Long-press empty canvas → 3-button add menu; double-tap → new note.
- [ ] Task 3s hold → progressive glow → haptic pop → done; blocked tasks don't complete.
- [ ] Card resize handles on all sides/corners; min-size respected.
- [ ] Markdown renders (headings/lists/emphasis/code/links).
- [ ] PDF cover + pages render; large MD/PDF no crash.
- [ ] Palette folded by default; custom slots persist across restart; frame/body toggle.
- [ ] Toolbar movable, snaps to edges, remembers position.
- [ ] Notifications top, compact, auto-dismiss, Undo works.
- [ ] Undo/redo across all mutations; recovery snapshot restores.
- [ ] JSON Canvas export re-imports losslessly (Obsidian round-trip).

---

## 8. Definition of Done (1.5.0)

Ship-ready when: min-cut table (§6) fully met; §1 bugs 1, 9, 17 (crash/priority/UX
blockers) fixed and the rest triaged; premium items landed where verifiable; every
merged batch passes `tsc --noEmit && npm test`; §7 checklist executed on a real Android
device by a human; docs (`COMBINED_PLAN.md`, `BLUEPRINT.md`, `IMPROVEMENTS-9.md`)
current; EAS/APK build link attached to the release PR from CI.

---

## 9. Progress & decision log

- **Batch 0 — in progress.** Widen zoom bounds to 0.01–50x with clamped focal-point
  pinch; unify clamp across pinch + zoom-request; add pan momentum (decay); make any
  gesture with ≥2 touches yield so two-finger navigation always wins. Extracted camera
  math to `src/lib/camera.ts`. Gate: `tsc --noEmit && npm test` green.
- Decision: keep SVG renderer; defer Skia to an explicit greenlight (see §0) — SVG is
  verifiable in-sandbox and avoids an unvalidated native dependency.
- Decision: land batches as incremental type-checked PRs, not one monolith — matches
  environment constraints and keeps review tractable.
- **Batch 1 — landed.** JSON Canvas 1.0 import/export (`src/lib/jsoncanvas.ts`) and
  AI-board coordinate repair (`src/lib/normalize.ts`), wired end-to-end: a new
  Import/export panel (More → Import/export) lets you export the current board,
  paste a JSON Canvas document (Fieldnote's own, Obsidian's, or one pasted from an AI
  generator) to append or replace, and a one-tap "Repair map" fixes stacked/out-of-
  range cards on the board you already have open. Every Fieldnote item round-trips
  losslessly via `metadata.fieldnote` on export; foreign documents map onto text/group
  nodes. Repair runs three passes: fix individual bad coordinates/sizes, rescale+recenter
  layouts at an extreme scale, then spread exactly-stacked duplicates. Addresses bug #19
  (AI boards glitch on import) and lands the JSON Canvas feature promised in the brief.
  Scope note: connectors/edges are intentionally not modeled yet — Fieldnote has no
  first-class connector item until Batch 8, so `edges` is always `[]` on export; that's
  a decision, not an oversight. Gate: `tsc --noEmit && npm test` (13/13) green.
- **Batch 2 — landed.** Vertical color palette (`src/components/Palette.tsx`),
  attached beside the toolbar and default-closed (bug #11) via a new "Color" toolbar
  button. Frame vs. body target toggle (frame → `backgroundColor`, body → `color`),
  8 preset swatches, and 5 persistent custom slots stored under their own AsyncStorage
  key (`src/lib/storage.ts`) so clearing/resetting boards never discards saved colors.
  Holding a slot saves the last color applied into it. `applyPaletteColor` in
  `BoardContext` applies to the current selection (any number of items, any type) or,
  with nothing selected and the draw tool active, becomes the draw color. Extended
  `CanvasItemView` so `item.color` is actually honored by task text, mind-map hub text,
  and shape stroke (previously hardcoded to `colors.ink`), so "body" coloring has a
  visible, consistent effect across item types rather than only affecting plain text
  cards. Gate: `tsc --noEmit && npm test` (13/13) green.
