# Fieldnote Combined Plan v2 — Execution Contract

**Status legend:** `[ ]` pending · `[~]` in progress · `[x]` done  
**Branch:** `cursor/fieldnote-app-icon-7fc8`  
**Program version:** Batches 0–12 shipped as **1.5.0**; patches **1.5.1** (gestures) / **1.5.2** (Phase 2 early) / **1.5.3** (disclosure DoD close-out)  
**Last updated:** 2026-07-22 autonomous agent  
**Authoritative product:** Android Expo infinite canvas (`/workspace/fieldnote`)

---

## Progress

| Batch | Scope | Status | Ship note |
|-------|--------|--------|-----------|
| Plan doc | This file exhaustive | [x] | v2 complete |
| 0 | Foundations scaffolds A1–A8 | [x] | |
| 1 | deleteItems + graph prune (B1,15,16) | [x] | |
| 2 | Mind-map model (B2,6,17) | [x] | |
| 3 | History + task edit (B3,4,5) | [x] | |
| 4 | Gestures + live connectors (B10–13) | [x] | + user override: 1-finger pan default |
| 5 | Live chrome (U1,6,8,14–16) | [x] | disclosure wired in App |
| 6 | Kill Alerts + edge sheets (U3,12,13) | [x] | |
| 7 | Color + format (B7,8,U2,5,9,10) | [x] | |
| 8 | Dense tools (U4,11,17) | [x] | |
| 9 | Mind UI + PDF + regions (B9,14,U7) | [x] | |
| 10 | Softness + disclosure (U18–20) | [x] | |
| 11 | Persistence (B18–20) | [x] | |
| 12 | Verify + EAS | [x] | 1.5.0 then 1.5.1/1.5.2 previews |

**Resume rule:** First `[ ]` row wins. Do not restart completed batches.

---

## Locked decisions

1. Task hold remains **Exclusive** for incomplete unblocked tasks; edit via done/blocked long-press + selection/Format Edit  
2. Full-screen **two-finger nav** (pinch + pan) on the gesture plane — activates at `minPointers(2)` so it does not steal one-finger  
3. Edge-to-edge canvas; chrome uses safe-area + keyboard insets via `ChromeLayoutProvider`  
4. No system `Alert` for routine canvas actions (stroke / connector / region / add)  
5. Draw + 2nd finger finalizes/cancels stroke and yields to nav (`onFinalize`)  
6. JSON Canvas: Obsidian-safe nodes + `metadata.fieldnote` for lossless Fieldnote data  
7. Missing deps treated as **satisfied** AND pruned on delete  
8. Ship program as **1.5.0** when Batches 0–12 done (subsequent patches may bump patch)

### User override (Jul 2026) — supersedes original Batch 4 marquee-default

| Mode | One finger empty | Two finger |
|------|------------------|------------|
| **select (default)** | **Pan** (map-like) | Pinch zoom; pan if not pinching |
| **multi (opt-in)** | Marquee (additive) | Pan + pinch |
| **lasso (Phase 2)** | Freehand loop select | Pan + pinch |
| **draw** | Ink stroke | Pan + pinch; stroke finalizes |

Pinch is the **sole writer** of `tx`/`ty` while pinching (`zoomAboutStartFocal`). Two-finger pan yields and resyncs baseline.

---

## Open decisions (chosen defaults — do not re-ask)

| Topic | Choice |
|-------|--------|
| Minimap while editing | **Hidden** (`visibleSlots('edit')` omits minimap) |
| Toolbar | Icon-only + a11y labels + long-press tip toast; persist collapse |
| Edge sheets | Bottom on phones; right on width ≥600 (`ModalShell` variant) |
| Reset / Clear | `FloatingActionSheet` confirm (not Alert) |
| Import panel | **Merge default** (primary); Replace secondary (snapshots first) |
| Media import | Copy into `documentDirectory` (not cache-only) |
| Lasso + voice | Phase 2 after 1.5.0 (lasso shipped early in 1.5.2) |

---

## Anti-patterns (never reintroduce)

1. Non-worklet JS from pinch/pan worklets  
2. World-sized 4000² SVG/Skia surfaces / `renderToHardwareTextureAndroid` on world  
3. `select([id]); deleteSelected();` — use `deleteItems([id])`  
4. Hard-coded chrome `top:54` after Batch 5 — use `useChromeSlot`  
5. Stacked zoom + selection bars — single `ZoomControls` swap  
6. Center `Alert` for ink/connector/region/add  
7. Two Exclusive LongPress on one active task  
8. Import without id remap (`ensureUniqueIds`)  
9. Trust stale `parentId` — run `assignRegionParents` after geometry  
10. Commit `node_modules`, credentials, `fieldnote-web/dist`

---

## 20 Bugs → batches

| ID | Bug | Batch | Fix locus |
|----|-----|-------|-----------|
| B1 | Delete after long-press wrong/noop | 1 | `deleteItems([id])` in sheets |
| B2 | Mind-map collapse broken at All | 2 | `visibleMindMapIds` no re-add |
| B3 | Tasks can't enter edit | 3 | done/blocked → edit LongPress |
| B4 | Text edits not undoable | 3 | `setEditingId` → `pushHistory` |
| B5 | Undo after New board orphans id | 3 | `HistoryEntry.currentBoardId` |
| B6 | Add Mind Map fake child ids | 2 | `createMindMapTree` |
| B7 | Body color doesn't recolor drawings | 7 | `applyColorToSelected` paths |
| B8 | Shape stroke ignores body color | 7 | `CanvasItemView` stroke |
| B9 | PDF Open no-op | 9 | `onOpenPdf` + modal |
| B10 | Draw blocks 2-finger mid-stroke | 4 | Simultaneous + finalize |
| B11 | 2-finger over objects fails | 4 | twoFingerNav on plane |
| B12 | Cancelled draw stuck stroke | 4 | `onFinalize` endStroke |
| B13 | Connectors don't follow drag | 4 | `ConnectorLayer` dragVisual |
| B14 | Stale region parentId | 9 | `assignRegionParents` |
| B15 | Delete leaves dangling graph | 1 | `pruneDeletedIds` |
| B16 | Missing dep blocks forever | 1 | missing ⇒ satisfied |
| B17 | Duplicate breaks graphs | 2 | remap + expandMindMap |
| B18 | JSON import duplicate ids | 11 | `ensureUniqueIds` |
| B19 | JSON round-trip data loss | 11 | `metadata.fieldnote` |
| B20 | Landmark zoom dropped SQLite | 11 | zoom column + migration |

## 20 UI improvements → batches

| ID | Improvement | Batch | Fix locus |
|----|-------------|-------|-----------|
| U1 | Live floating-panel collision | 5 | `panelLayout` + ChromeLayout |
| U2 | Keyboard-aware TextFormat | 7 | keyboard inset in provider |
| U3 | Replace center Alerts | 6 | FloatingActionSheet / toast |
| U4 | Selection badge on Multi | 8 | Toolbar Multi badge |
| U5 | One color surface in draw | 7 | DrawPalette width-only |
| U6 | Format vs Minimap | 5 | resolveAll priorities |
| U7 | Mind-map contextual toolbar | 9 | MindMapToolbar |
| U8 | Exit-region chip in engine | 5 | ExitRegionChip + slot |
| U9 | Progressive TextFormat | 7 | TextFormatPanel |
| U10 | Frame/Body only when relevant | 7 | `allowedTargets` |
| U11 | Denser icon-first toolbar | 8 | Toolbar |
| U12 | Edge sheets vs center modals | 6 | ModalShell edge |
| U13 | Contextual add in-place | 6 | ContextualAddMenu |
| U14 | Clamp contextual add | 5 | clamp to viewport |
| U15 | Badge + Toast choreography | 5 | slot priorities |
| U16 | Real safe-area insets | 5 | ChromeLayoutProvider |
| U17 | Progressive zoom/selection bars | 8 | ZoomControls swap |
| U18 | Softer selection chrome | 10 | theme + borders |
| U19 | Stop Markdown clipping | 10 | overflow hidden shell |
| U20 | Unified disclosure policy | 10 | `deriveChromeMode` in App |

---

## Foundations A1–A8

| ID | Artifact | Path |
|----|----------|------|
| A1 | `deleteItems(ids)` + `selectedIdsRef` | `src/store/BoardContext.tsx` |
| A2 | graph hygiene | `src/lib/graphHygiene.ts` + `.test.ts` |
| A3 | HistoryEntry | BoardContext history stack |
| A4 | Chrome layout | `src/chrome/ChromeLayoutContext.tsx`, `src/lib/panelLayout.ts` |
| A5 | Disclosure | `src/chrome/disclosure.ts` + test |
| A6 | FloatingActionSheet | `src/components/FloatingActionSheet.tsx` |
| A7 | Nav + draw finalize | `InfiniteCanvas.tsx` twoFingerNav |
| A8 | Region parents | `src/lib/regions.ts` + drag end |

---

## TypeScript API sketches

```ts
// src/lib/graphHygiene.ts
export function pruneDeletedIds(items: BoardItem[], deleted: Set<string>): BoardItem[]
export function remapIds(items: BoardItem[], idMap: Map<string, string>): BoardItem[]
export function ensureUniqueIds(
  incoming: BoardItem[],
  existingIds: Set<string>,
): { items: BoardItem[]; idMap: Map<string, string> }
export function expandMindMapSelection(items: BoardItem[], selectedIds: string[]): string[]

// src/lib/mindMap.ts
export function createMindMapTree(
  anchor: { x: number; y: number },
  labels?: string[],
): MindMapItem[]
export function visibleMindMapIds(
  items: BoardItem[],
  depth: number | 'all',
): Set<string>
// CRITICAL: when depth==='all', still honor collapsed — do NOT re-add children

// src/lib/taskGraph.ts
export function canCompleteTask(task: TaskItem, items: BoardItem[]): boolean
// missing dep id ⇒ treated as satisfied

// src/lib/camera.ts (worklets)
export function zoomAboutFocal(...): { scale; tx; ty }
export function zoomAboutStartFocal(
  nextScale, startFx, startFy, curFx, curFy, prevScale, prevTx, prevTy, soft?
): { scale; tx; ty }
// Pinch uses start-focal world point pinned to CURRENT midpoint (no pan fight)

// src/lib/snap.ts
export function computeAlignmentGuides(moving: Box, others: Box[], threshold?): { dx; dy; guides }
export function pointInPolygon(point, polygon): boolean

// History
type HistoryEntry = {
  boards: Board[]
  currentBoardId: string
  selectedIds: string[]
}

// Chrome
type ChromeSlotId =
  | 'toolbar' | 'badge' | 'toast' | 'color' | 'format' | 'minimap'
  | 'zoom' | 'selection' | 'drawInk' | 'exitRegion' | 'contextualAdd' | 'mindmapToolbar'
type ChromeMode = 'idle' | 'draw' | 'select' | 'edit' | 'mindmap' | 'region'
export function deriveChromeMode(input: {
  tool: string
  selectedTypes: string[]
  editing: boolean
  focusedRegion: boolean
  hasMindMapSelection: boolean
}): ChromeMode
export function visibleSlots(mode: ChromeMode, opts?: { toast?: boolean; format?: boolean }): Set<ChromeSlotId>

// BoardContext (selected)
deleteItems(ids: string[]): void
selectInRect(rect, additive?: boolean): void
selectInPolygon(polygon, additive?: boolean): void
toggleLockSelected(): void
restoreSnapshot(id: string): Promise<{ ok: boolean; error?: string }>
importJsonCanvasText(raw): { ok; error?; count? }  // repair + snapshot + merge
pasteAiBoard(raw): { ok; error?; count? }           // repair + snapshot + replace
```

---

## Chrome ASCII maps (every disclosure mode)

### idle
```
┌──────────────────────────────┐
│         [Badge]              │
│ [Toolbar][Color▾]    [Mini]  │
│                      [Zoom]  │
│         CANVAS               │
└──────────────────────────────┘
```

### draw
```
┌──────────────────────────────┐
│ [Toolbar][Color OPEN][Width] │
│                      [Zoom]  │
│         CANVAS (ink)         │
│ (minimap hidden)             │
└──────────────────────────────┘
```

### select (cards selected)
```
┌──────────────────────────────┐
│ [Toolbar][Color]  [Format?]  │
│                   [Minimap]  │
│              [Selection bar] │
└──────────────────────────────┘
```

### edit (+ keyboard)
```
┌──────────────────────────────┐
│ [Toolbar]         [Format]   │
│══════════════════════════════│
│         keyboard             │
│ (minimap HIDDEN)             │
└──────────────────────────────┘
```

### region (focused)
```
┌──────────────────────────────┐
│ [Exit chip][Toolbar][Color]  │
│                      [Zoom]  │
│     region as canvas bg      │
└──────────────────────────────┘
```

### mindmap
```
┌──────────────────────────────┐
│      [MindMapToolbar]        │
│         [node]               │
│ [Toolbar][Color][Selection]  │
└──────────────────────────────┘
```

### contextual add (overlay)
```
  finger •
 ┌─────────────────┐
 │ Files│Device│New│X │  ← clamped to safe viewport
 └─────────────────┘
```

### Disclosure → slots table

| Mode | Always | Conditional |
|------|--------|-------------|
| idle | toolbar, badge, zoom, minimap, color | toast |
| draw | toolbar, badge, zoom, color, drawInk | toast |
| select | toolbar, badge, selection, color, minimap | format, toast |
| edit | toolbar, format, color | toast — **no minimap** |
| mindmap | toolbar, mindmapToolbar, color, selection | toast |
| region | toolbar, exitRegion, zoom, badge, color | toast |

---

## Per-file change maps (Batches 0–12)

### Batch 0 — Foundations
| Action | File |
|--------|------|
| CREATE | `src/lib/graphHygiene.ts`, `src/lib/graphHygiene.test.ts` |
| EXTEND | `src/lib/panelLayout.ts` (`resolveAll`, anchors) |
| CREATE | `src/chrome/ChromeLayoutContext.tsx` |
| CREATE | `src/chrome/disclosure.ts` (+ test if present) |
| CREATE | `src/components/FloatingActionSheet.tsx` |
| EXTEND | `src/store/BoardContext.tsx` — `deleteItems` stub, `selectedIdsRef`, HistoryEntry type |
| EXTEND | `App.tsx` — wrap `ChromeLayoutProvider` |
| EXTEND | `src/lib/mindMap.ts` — export `createMindMapTree` |
| CREATE/EXTEND | `src/lib/gesturePriority.ts` |

### Batch 1 — Delete + graph
| Action | File |
|--------|------|
| EXTEND | `BoardContext.tsx` — `deleteItems` + `pruneDeletedIds` |
| EXTEND | `src/lib/taskGraph.ts` — missing dep satisfied |
| EXTEND | `InfiniteCanvas.tsx` — sheet Delete → `deleteItems([id])` |
| EXTEND | tests for prune / taskGraph |

### Batch 2 — Mind map model
| Action | File |
|--------|------|
| EXTEND | `mindMap.ts` — collapse@All + `createMindMapTree` |
| EXTEND | `AddPanel.tsx` — real mind map tree |
| EXTEND | `BoardContext.tsx` — duplicate remap + `expandMindMapSelection` |
| EXTEND | `mindMap.test.ts`, seed audit |

### Batch 3 — History + task edit
| Action | File |
|--------|------|
| EXTEND | `BoardContext.tsx` — undo/redo restore `currentBoardId` + selection |
| EXTEND | `setEditingId` → beginHistory |
| EXTEND | `InfiniteCanvas.tsx` — Exclusive taskHold; edit LP when done/blocked |
| EXTEND | Format / selection Edit entry |

### Batch 4 — Gestures + connectors
| Action | File |
|--------|------|
| EXTEND | `InfiniteCanvas.tsx` — twoFingerNav Simultaneous; draw finalize; pinch `zoomAboutStartFocal`; oneFingerPan / marquee / lasso branches |
| EXTEND | `camera.ts` — softClamp + zoomAboutStartFocal |
| EXTEND | `ConnectorLayer.tsx` — `dragVisual` offsets |
| EXTEND | `gesturePriority.ts` docs |
| EXTEND | `camera.test.ts` |

### Batch 5 — Live chrome
| Action | File |
|--------|------|
| EXTEND | Toolbar, Toast, Minimap, ExitRegionChip → `useChromeSlot` |
| CREATE | `src/components/ExitRegionChip.tsx` |
| EXTEND | `App.tsx` — mount ExitRegionChip; remove hard-coded exit from canvas |
| EXTEND | Toast undo+dismiss; ContextualAdd clamp |
| REMOVE | magic `top:54` where migrated |

### Batch 6 — Alerts → sheets
| Action | File |
|--------|------|
| EXTEND | InfiniteCanvas sheets for stroke/connector/region |
| EXTEND | ContextualAddMenu submenus |
| EXTEND | ModalShell edge variant |
| EXTEND | Places/PasteAi/Boards/More → toast or FloatingActionSheet |

### Batch 7 — Color + format
| Action | File |
|--------|------|
| EXTEND | `applyColorToSelected` drawings |
| EXTEND | CanvasItemView shape stroke |
| EXTEND | DrawPalette width-only; VerticalColorPalette `allowedTargets` |
| EXTEND | TextFormatPanel progressive + keyboard |

### Batch 8 — Dense tools
| Action | File |
|--------|------|
| EXTEND | Toolbar icon-only, Multi badge, AsyncStorage collapse |
| EXTEND | ZoomControls single bar (zoom ↔ selection) |

### Batch 9 — Mind UI + PDF + regions
| Action | File |
|--------|------|
| CREATE | MindMapToolbar.tsx |
| EXTEND | BoardContext addMindMapChild/Sibling |
| EXTEND | PDF open + PdfReaderModal reset on uri |
| EXTEND | assignRegionParents on drag/resize end |

### Batch 10 — Softness + disclosure
| Action | File |
|--------|------|
| EXTEND | theme selection softness |
| EXTEND | CanvasItemView overflow hidden |
| EXTEND | `App.tsx` — `deriveChromeMode` + `visibleSlots` gates chrome |
| EXTEND | MarkdownView layout |

### Batch 11 — Persistence
| Action | File |
|--------|------|
| EXTEND | import `ensureUniqueIds` |
| EXTEND | `jsonCanvas.ts` metadata.fieldnote |
| EXTEND | sqliteStore landmark zoom migration |
| EXTEND | files.ts persistLocalUri → documentDirectory |
| EXTEND | snapshots.ts + SnapshotsPanel (Phase 2 early OK) |

### Batch 12 — Verify + ship
| Action | File |
|--------|------|
| WRITE | `docs/QA_MATRIX.md` |
| BUMP | package.json / app.json → 1.5.0 (then patches) |
| RUN | `npx tsc --noEmit`, `npm test` |
| EAS | Android preview; link APK on PR #13 |
| UPDATE | BLUEPRINT.md, IMPROVEMENTS-9.md |

---

## Phase 2 (after 1.5.0)

| ID | Item | Status |
|----|------|--------|
| P2.1 | Connector endpoint multitouch drag | [ ] |
| P2.2 | Lasso | [x] early in 1.5.2 |
| P2.3 | Region PNG/PDF/ZIP | [ ] |
| P2.4 | Voice dictation | [ ] |
| P2.5 | Full a11y audit | [ ] |
| P2.6 | Full Skia scene graph | [ ] |
| P2.7 | Large-canvas virtualization | [ ] |
| P2.8 | Live alignment guides | [x] early in 1.5.2 |
| P2.9 | Lock objects UI | [x] early in 1.5.2 |
| P2.10 | Snapshot compare UI | [~] list/restore exists |
| P2.11 | Generate with AI | [ ] |
| P2.12 | Formal Android QA matrix | [x] `docs/QA_MATRIX.md` |

---

## 1.5.0 minimum-cut vs full scope

| Must ship in 1.5.0 | May defer to patch if blocked |
|--------------------|-------------------------------|
| Batches 0–6 complete | B19 metadata schema iteration |
| Batch 7 core color/format | U18–U20 lighter polish |
| Batch 8 toolbar densify | Phase 2 all |
| Batch 11 B18 + B20 | Snapshot compare UI |
| Batch 12 EAS + tests green | Voice, Skia rewrite |
| Gesture non-regress + zoom no crash | Lasso (shipped early OK) |

**This program targets FULL 0–12**, not minimum-cut only.

---

## Definition of Done (whole program)

1. Progress table all `[x]`  
2. `npx tsc --noEmit` + `npm test` green in `fieldnote/`  
3. QA checklist in `docs/QA_MATRIX.md` filled or noted  
4. Version ≥ 1.5.0 in package.json / app.json  
5. EAS Android preview APK linked on PR #13  
6. BLUEPRINT.md + IMPROVEMENTS-9.md updated  
7. Gesture + zoom non-regress documented (this file + gesturePriority)  
8. No anti-patterns in shipped code  
9. Disclosure gates minimap while editing  
10. Import Merge is primary action  

---

## Full Android QA checklist

See also `docs/QA_MATRIX.md`.

### Gestures
- [ ] Pinch empty — no crash, no sideways drift  
- [ ] Pinch on text card  
- [ ] Default one-finger empty = pan  
- [ ] Multi ON → marquee; two-finger pan  
- [ ] Object drag / resize  
- [ ] Draw + 2nd finger pans; no ghost stroke  
- [ ] Long-press empty → 3-button add  
- [ ] Lasso freehand select  

### Tasks / mind maps
- [ ] 3s hold complete + glow  
- [ ] Water-flow deps block/unblock  
- [ ] Collapse @ depth All  
- [ ] Add Mind Map → 3 real nodes  
- [ ] MindMapToolbar child/sibling/tidy  
- [ ] Undo after edit / new board  

### Chrome
- [ ] Format + Minimap no overlap  
- [ ] Minimap hidden while editing  
- [ ] Exit region chip via chrome slot  
- [ ] Toast Undo  
- [ ] No Alert for stroke/connector/region/add/places/boards  
- [ ] Multi badge; single bottom bar  
- [ ] Lock blocks drag/resize  

### Data
- [ ] PDF Open  
- [ ] Landmark zoom restore  
- [ ] Import unique ids  
- [ ] Snapshots restore  
- [ ] Paste AI Merge default + Replace snapshot  

### Non-regress
- [ ] Fit / zoom buttons  
- [ ] Reduce Motion mutes haptics  
- [ ] Demo board readable  

---

## Risks

| Risk | Mitigation |
|------|------------|
| Nav eats one-finger | `minPointers(2)` only |
| Pinch sideways drift | pinch owns tx/ty; pan yields while `pinching` |
| Chrome jank | resolve on layout/keyboard, not RAF |
| Zoom crash | worklets only; tight SVG bounds; no HW texture on world |
| History memory | cap ~50 |
| Scope creep | Phase 2 gated |

---

## EAS / PR

- PR: https://github.com/tomasdensley-source/Claud/pull/13  
- Branch: `cursor/fieldnote-app-icon-7fc8`  
- Latest preview builds linked in PR body as they finish  

---

*Fresh agents: read Progress + git log (`git log --oneline -20`); resume first `[ ]`. Do not restart. Do not ask the user to continue.*
