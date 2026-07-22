# Fieldnote Combined Plan v2 — Execution Contract

**Status legend:** `[ ]` pending · `[~]` in progress · `[x]` done  
**Branch:** `cursor/fieldnote-app-icon-7fc8`  
**Target version:** 1.5.0  
**Last updated:** agent autonomous run

## Progress

| Batch | Scope | Status |
|-------|--------|--------|
| Plan doc | This file exhaustive | [x] |
| 0 | Foundations scaffolds | [x] |
| 1 | deleteItems + graph prune (B1,15,16) | [x] |
| 2 | Mind-map model (B2,6,17) | [x] |
| 3 | History + task edit (B3,4,5) | [x] |
| 4 | Gestures + live connectors (B10–13) | [x] |
| 5 | Live chrome (U1,6,8,14–16) | [x] |
| 6 | Kill Alerts + edge sheets (U3,12,13) | [x] |
| 7 | Color + format (B7,8,U2,5,9,10) | [x] |
| 8 | Dense tools (U4,11,17) | [x] |
| 9 | Mind UI + PDF + regions (B9,14,U7) | [x] |
| 10 | Softness + disclosure (U18–20) | [x] |
| 11 | Persistence (B18–20) | [x] |
| 12 | Verify + EAS 1.5.0 | [x] |

---

## Locked decisions

- Task hold Exclusive for incomplete unblocked tasks; edit via done/blocked long-press + selection/Format Edit
- Full-screen 2-finger nav overlay above items
- Edge-to-edge canvas; chrome uses safe-area + keyboard insets
- No system Alert for routine canvas actions
- Draw + 2nd finger finalizes/cancels stroke and yields to nav
- JSON Canvas: Obsidian-safe nodes + `metadata.fieldnote` lossless extras
- Missing deps satisfied AND pruned on delete
- Ship 1.5.0 after batches 0–12

## Open decisions (chosen defaults)

- Minimap hidden while editing
- Toolbar icon-only + a11y labels + long-press tip; persist collapse
- Edge sheets: bottom &lt;600dp, right ≥600
- Reset/Clear → FloatingActionSheet confirm
- Import: Merge default + Replace option
- Media import → copy to `documentDirectory`
- Lasso + voice → Phase 2

## Anti-patterns

1. Non-worklet calls from pinch/pan worklets  
2. World-sized 4000² SVG/Skia / hardware texture on world  
3. `select([id]); deleteSelected();`  
4. Hard-coded chrome `top:54` after Batch 5  
5. Stacked zoom + selection bars  
6. Center Alert for ink/connector/region/add  
7. Two Exclusive LongPress on one active task  
8. Import without id remap  
9. Trust stale `parentId`  
10. Commit node_modules / credentials / fieldnote-web/dist  

---

## 20 Bugs

| ID | Bug | Batch |
|----|-----|-------|
| B1 | Delete after long-press wrong/noop | 1 |
| B2 | Mind-map collapse broken at All | 2 |
| B3 | Tasks can't enter edit | 3 |
| B4 | Text edits not undoable | 3 |
| B5 | Undo after New board orphans id | 3 |
| B6 | Add Mind Map fake child ids | 2 |
| B7 | Body color doesn't recolor drawings | 7 |
| B8 | Shape stroke ignores body color | 7 |
| B9 | PDF Open no-op | 9 |
| B10 | Draw blocks 2-finger mid-stroke | 4 |
| B11 | 2-finger over objects fails | 4 |
| B12 | Cancelled draw stuck stroke | 4 |
| B13 | Connectors don't follow drag | 4 |
| B14 | Stale region parentId | 9 |
| B15 | Delete leaves dangling graph | 1 |
| B16 | Missing dep blocks forever | 1 |
| B17 | Duplicate breaks graphs | 2 |
| B18 | JSON import duplicate ids | 11 |
| B19 | JSON round-trip data loss | 11 |
| B20 | Landmark zoom dropped SQLite | 11 |

## 20 UI improvements

| ID | Improvement | Batch |
|----|-------------|-------|
| U1 | Live floating-panel collision | 5 |
| U2 | Keyboard-aware TextFormat | 7 |
| U3 | Replace center Alerts | 6 |
| U4 | Selection badge on Multi | 8 |
| U5 | One color surface in draw | 7 |
| U6 | Format vs Minimap | 5 |
| U7 | Mind-map contextual toolbar | 9 |
| U8 | Exit-region chip in engine | 5 |
| U9 | Progressive TextFormat | 7 |
| U10 | Frame/Body only when relevant | 7 |
| U11 | Denser icon-first toolbar | 8 |
| U12 | Edge sheets vs center modals | 6 |
| U13 | Contextual add in-place | 6 |
| U14 | Clamp contextual add | 5 |
| U15 | Badge + Toast choreography | 5 |
| U16 | Real safe-area insets | 5 |
| U17 | Progressive zoom/selection bars | 8 |
| U18 | Softer selection chrome | 10 |
| U19 | Stop Markdown clipping | 10 |
| U20 | Unified disclosure policy | 10 |

---

## Foundations A1–A8

- **A1** `deleteItems(ids)` + `selectedIdsRef`
- **A2** `src/lib/graphHygiene.ts` — prune, remap, ensureUniqueIds, expandMindMapSelection
- **A3** HistoryEntry `{ boards, currentBoardId, selectedIds }`
- **A4** ChromeLayoutProvider + panelLayout resolveAll
- **A5** disclosure.ts modes → visibleSlots
- **A6** FloatingActionSheet
- **A7** Nav overlay + draw onFinalize
- **A8** assignRegionParents after geometry; clear focusedRegionId if missing

---

## API sketches

```ts
// graphHygiene.ts
pruneDeletedIds(items, deleted: Set<string>): BoardItem[]
remapIds(items, idMap: Map<string,string>): BoardItem[]
ensureUniqueIds(incoming, existingIds: Set<string>): { items, idMap }
expandMindMapSelection(items, selectedIds: string[]): string[]

// mindMap.ts
createMindMapTree(anchor, labels?): MindMapItem[]
// visibleMindMapIds: NO depth==='all' re-add of collapsed children

// taskGraph.ts
// missing dep => satisfied: !dep || dep.done

// HistoryEntry
{ boards: Board[]; currentBoardId: string; selectedIds: string[] }

// ChromeSlotId
'toolbar'|'badge'|'toast'|'color'|'format'|'minimap'|'zoom'|'selection'|'drawInk'|'exitRegion'|'contextualAdd'|'mindmapToolbar'

// disclosure
type ChromeMode = 'idle'|'draw'|'select'|'edit'|'mindmap'|'region'
visibleSlots(mode): Set<ChromeSlotId>
```

---

## Chrome ASCII maps

### idle
```
[Badge]
[Toolbar][Color tab]          [Minimap]
                     [Zoom bar]
```

### draw
```
[Toolbar][Color OPEN][Width]
                     [Zoom]
(minimap hidden)
```

### select (text)
```
[Toolbar][Color]     [Format]
                     [Minimap nudged]
                     [Selection bar]
```

### edit + keyboard
```
[Toolbar]            [Format above kb]
════════ keyboard ════════
(minimap hidden)
```

### region
```
[Toolbar][Exit chip] ...
```

### mindmap
```
        [MindMapToolbar]
        [node]
```

### contextual add
```
  finger•
 [Files|Device|New|X]  // clamped
```

### Disclosure → slots

| Mode | Slots |
|------|-------|
| idle | toolbar,badge,zoom,minimap,color(folded) |
| draw | toolbar,badge,zoom,color(open),drawInk |
| select | toolbar,badge,selection,color,format?,minimap |
| edit | toolbar,format,color — hide minimap |
| mindmap | toolbar,mindmapToolbar,color,selection/zoom |
| region | toolbar,exitRegion,zoom,badge,color |
| toast | any mode when message set |

---

## Per-file maps

### Batch 0
- CREATE `src/lib/graphHygiene.ts` + test
- EXTEND `src/lib/panelLayout.ts` (resolveAll, anchors)
- CREATE `src/chrome/ChromeLayoutContext.tsx`
- CREATE `src/chrome/disclosure.ts` + test
- CREATE `src/components/FloatingActionSheet.tsx`
- BoardContext: deleteItems stub, selectedIdsRef, HistoryEntry type prep
- App: wrap ChromeLayoutProvider
- mindMap: createMindMapTree export

### Batch 1
- BoardContext deleteItems + prune
- taskGraph missing-dep
- InfiniteCanvas Delete → deleteItems([id])
- tests

### Batch 2
- mindMap visibleMindMapIds fix + createMindMapTree
- AddPanel addMindMap
- duplicateSelected remap + expandMindMapSelection
- seed audit
- tests

### Batch 3
- HistoryEntry undo/redo restore currentBoardId
- beginHistory on edit enter
- task edit when done/blocked; Format/selection Edit
- tests manual

### Batch 4
- InfiniteCanvas nav overlay, draw Simultaneous+finalize, pinch/pan compose
- ConnectorLayer dragVisual
- gesturePriority docs

### Batch 5
- Wire all chrome to useChromeSlot
- Lift exit chip to App
- Toast undo+dismiss; ContextualAdd clamp
- Remove magic positions

### Batch 6
- FloatingActionSheet for stroke/connector/region
- ContextualAdd submenus
- ModalShell variant edge
- Places/PasteAi toasts

### Batch 7
- applyColor drawings paths; shape stroke color
- DrawInkWidth only; VerticalColorPalette targets
- TextFormat progressive; keyboard format slot

### Batch 8
- Toolbar icon-only, Multi badge, persist collapse
- ZoomControls single bar swap

### Batch 9
- MindMapToolbar + addMindMapChild/Sibling
- onOpenPdf; PdfReaderModal reset
- assignRegionParents on drag/resize end; clear focus

### Batch 10
- Softer selection; markdown grow/overflow
- Enforce disclosure in App

### Batch 11
- ensureUniqueIds on import; metadata.fieldnote
- sqlite landmark zoom migration
- copy media to documentDirectory
- clear landmarks on reset

### Batch 12
- Full QA matrix; bump 1.5.0; EAS preview; update PR #13

---

## Phase 2 (after 1.5.0)

P2.1 Connector endpoint multitouch drag  
P2.2 Lasso  
P2.3 Region PNG/PDF/ZIP  
P2.4 Voice dictation  
P2.5 Full a11y audit  
P2.6 Full Skia scene graph  
P2.7 Large-canvas virtualization  
P2.8 Live alignment guides  
P2.9 Lock objects UI  
P2.10 Snapshot compare UI  
P2.11 Generate with AI  
P2.12 Formal Android verification matrix doc  

---

## 1.5.0 minimum vs full

| Must | Defer to 1.5.1 only if blocked |
|------|--------------------------------|
| Batches 0–6, 7 (core), 8, 11 (B18,B20), 12 | B19 partial OK if metadata schema needs iteration |
| U7 if Batch 2 done | U18–U20 can be lighter |
| This program targets FULL 0–12 | |

---

## Definition of Done

1. All Progress table rows `[x]`  
2. `tsc --noEmit` + `npm test` green  
3. QA checklist in this doc mostly verified or noted  
4. version 1.5.0 in package.json/app.json  
5. EAS preview APK linked on PR #13  
6. BLUEPRINT.md checkboxes updated  
7. IMPROVEMENTS-9.md changelog written  
8. Gesture + zoom non-regress documented  

## QA checklist (device)

See autonomous mandate Batch 12 matrix: gestures, tasks/mindmaps, delete/graph, chrome, no Alerts, color/PDF/places, non-regress zoom.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Nav overlay eats one-finger | Activate only minPointers(2) |
| Chrome jank | Resolve on layout/keyboard change not RAF |
| Zoom crash regress | Keep worklets; no world surfaces |
| History memory | Cap 50 |
| Scope creep Phase 2 | Gated |

---

*Fresh agents: read Progress table + git log; resume first `[ ]` batch. Do not restart.*
