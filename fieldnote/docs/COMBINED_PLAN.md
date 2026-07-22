# Fieldnote Combined Plan v3 — Premium 1.5.0 Execution Contract

**Branch:** `cursor/fieldnote-combined-plan-7fc8`  
**Program:** Quietly premium Android Expo infinite canvas  
**Status:** `[ ]` pending · `[~]` in progress · `[x]` done  
**Last updated:** 2026-07-22

## Progress

| Batch | Scope | Status |
|-------|--------|--------|
| Plan v3 | This exhaustive contract | [x] |
| 0 | Foundation & infinite canvas engine | [x] |
| 1 | Data model, storage, JSON Canvas | [x] |
| 2 | Color system & vertical palette | [x] |
| 3 | Floating UI + movable toolbar | [x] |
| 4 | Gestures + double-tap + edge-pan + side handles | [x] |
| 5 | Chrome / disclosure / edge-to-edge | [x] |
| 6 | Text, tasks, Markdown, water-flow | [x] |
| 7 | Mind maps, regions, Repair Map | [x] |
| 8 | Drawing, connectors, advanced edit | [x] |
| 9 | Audio, playlists, folder tree | [x] |
| 10 | PDF covers & media polish | [x] |
| 11 | Multi-board, search, export, AI | [x] |
| 12 | Premium polish, haptics, EAS verify | [x] |

---

## Philosophy (non-negotiable)

Calm · intentional · quietly premium. Defaults least noisy. Micro-interactions expensive. Complexity decreases while perceived quality rises. No visual noise, no panel fights, no janky gestures.

## Locked gesture contract (user-corrected)

| Mode | 1-finger empty | 2-finger |
|------|----------------|----------|
| select | Pan | Pinch (owns camera) + pan when not pinching |
| multi | Marquee | Pan + pinch |
| lasso | Freehand select | Pan + pinch |
| draw | Ink | Pan + pinch; stroke finalizes |

Anti-patterns: non-worklet pinch math · world-sized SVG/Skia · HW texture on world · select-then-delete · Alert for routine canvas · stacked zoom bars.

---

## Inventory map (bugs + features → batch)

### Critical bugs
| Item | Batch | Status |
|------|-------|--------|
| Infinite zoom 0.01–80× focal pinch | 0 | [x] |
| Skia live stroke + reliable draw | 0/8 | [x] (live Skia; saved SVG paths) |
| Task 3s glow hold | 6 | [x] |
| Resizable cards (corners + sides) | 4 | [~] |
| Markdown rich text | 6 | [x] |
| PDF in cards + cover | 10 | [~] |
| Premium visual design | 3/12 | [x]/[~] |
| Haptics | 12 | [x] |
| 2-finger nav priority | 4 | [x] |
| Floating panel collision | 3/5 | [x] |
| Color palette folded + persist + frame/body | 2 | [x] |
| Water-flow deps | 6 | [x] |
| Mind-map collapse/depth/tidy | 7 | [x] |
| Region bg layers | 7 | [x] |
| Connector long-press edit | 8 | [x] |
| Compact 3-button add | 4 | [x] |
| Top toast + Undo | 3 | [x] |
| Large MD/PDF soft handling | 10 | [~] |
| AI board repair | 1/7/11 | [x]/[~] Repair Map |
| Calm composed UX | 12 | [~] |

### Expanded features
| Item | Batch | Status |
|------|-------|--------|
| Audio + playlists | 9 | [~] |
| Folder tree + upload routing | 9 | [~] |
| PDF first-page cover | 10 | [~] |
| Movable toolbar grip/snap/persist | 3 | [~] |
| Extreme zoom + Repair Map | 7 | [~] |
| Side resize handles | 4 | [~] |
| Edge-pan while dragging | 4 | [~] |
| Double-tap empty → note | 4 | [~] |
| Alignment guides | 4 | [x] |
| Storage / multi-writer soft alerts | 11 | [~] |
| Region export | 11 | [x] |
| Boards / search / places / snapshots | 11 | [x] |

---

## API sketches (premium additions)

```ts
// types
type ItemType = ... | 'audio' | 'playlist'
interface AudioItem extends BoardItemBase {
  type: 'audio'; title: string; uri: string; durationMs?: number; coverUri?: string
}
interface PlaylistItem extends BoardItemBase {
  type: 'playlist'; title: string; trackIds: string[]; coverUri?: string
}
interface FileItem { ...; coverUri?: string; pageCount?: number }
interface FolderItem { ...; childIds?: string[]; working?: boolean }

// BoardContext
repairBoardLayout(): void  // layoutRepair + tidy all mind-map roots
addAudioAt(anchor, uri, title): string
addPlaylistAt(anchor, title): string

// Toolbar persist
type ToolbarPose = { x: number; y: number; edge: 'left'|'right'|'free' }
```

---

## Chrome ASCII (unchanged modes + toolbar grip)

```
[Badge]
[⠿ Toolbar↑grip][Color▾]          [Mini]
                          [Zoom/Selection]
```

Disclosure: edit hides minimap; region shows ExitRegionChip; draw hides mini.

---

## Per-batch file maps (v3 deltas)

### Batch 3 — Movable toolbar
- EXTEND `Toolbar.tsx` — grip Pan, edge snap, AsyncStorage pose
- EXTEND preferred slot from pose

### Batch 4 — Gestures ergonomics
- EXTEND `InfiniteCanvas.tsx` — side handles n/e/s/w; edge-pan on drag; DoubleTap → text
- EXTEND resize math for sides

### Batch 7 — Repair Map
- EXTEND `jsonCanvas.ts` / mindMap — `repairBoardLayout`
- EXTEND MindMapToolbar + MorePanel row

### Batch 9 — Audio & folders
- EXTEND `types.ts` audio/playlist
- CREATE `AudioCardView` / playlist controls (expo-av soft)
- EXTEND AddPanel + ContextualAdd + FilesPanel folder routing
- EXTEND storage/jsonCanvas for new types

### Batch 10 — PDF covers
- EXTEND FileItem.coverUri
- EXTEND CanvasItemView PDF cover treatment
- EXTEND files.ts soft cover path

### Batch 12 — Verify
- tsc + test + EAS + PR + QA_MATRIX

---

## Definition of Done

1. Progress rows all `[x]` or explicitly deferred with reason in Phase 2  
2. tsc + npm test green  
3. Inventory critical path present and polished  
4. EAS APK on PR  
5. App feels calmer/premium vs prior without new noise  

## Phase 2 deferrals (if blocked)

- Native PDF page raster covers (device PDF decoder)  
- Pressure-sensitive stylus drawing  
- Full multi-tab SQLite lock across processes  
- Voice dictation  

---

*Resume: first `[~]`/`[ ]` batch. Do not ask to continue.*
