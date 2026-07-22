# Fieldnote Combined Plan v3 — Finish Line Contract

**Branch:** `cursor/fieldnote-combined-plan-7fc8`  
**App version:** 1.6.2 (1.5.0 program complete + premium close-out)  
**Status:** `[ ]` pending · `[~]` in progress · `[x]` done  
**Last updated:** 2026-07-22

## Progress

| Batch | Scope | Status |
|-------|--------|--------|
| Plan v3 | Exhaustive contract | [x] |
| 0 | Foundation & infinite canvas engine | [x] |
| 1 | Data model, storage, JSON Canvas | [x] |
| 2 | Color system & vertical palette | [x] |
| 3 | Floating UI + movable toolbar + collision slots | [x] |
| 4 | Gestures + double-tap + edge-pan + side handles | [x] |
| 5 | Chrome / disclosure / edge sheets (≥600 right) | [x] |
| 6 | Text, tasks, Markdown soft-limit, water-flow motion | [x] |
| 7 | Mind maps, nested regions, Repair Map | [x] |
| 8 | Drawing, connectors, advanced edit | [x] |
| 9 | Audio, playlists, folder tree | [x] |
| 10 | PDF soft handling & media polish | [x] |
| 11 | Multi-board, search, export, AI | [x] |
| 12 | Premium polish, haptics, EAS verify | [x] |

---

## Philosophy

Calm · intentional · quietly premium. Defaults least noisy. Micro-interactions expensive. Complexity decreases while perceived quality rises.

## Locked gesture contract (user-corrected — do not revert)

| Mode | 1-finger empty | 2-finger |
|------|----------------|----------|
| **select (default)** | **Pan** (map-like) | Pinch owns camera; pan when not pinching |
| **multi** | Marquee (additive) | Pan + pinch |
| **lasso** | Freehand select | Pan + pinch |
| **draw** | Ink | Pan + pinch; stroke finalizes |

Anti-patterns: non-worklet pinch · world-sized SVG/Skia · HW texture on world · Alert for routine canvas · stacked zoom bars.

---

## Critical bugs → status (code-verified)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Infinite zoom 0.01–80× focal pinch | [x] | `camera.ts`, pinch worklets |
| 2 | Drawing Skia live + reliable | [x] | `LiveStrokeOverlay` Skia; saved SVG paths |
| 3 | Task 3s glow hold | [x] | `GESTURE.TASK_HOLD_MS`, CanvasItemView glow |
| 4 | Resizable boxes corners + sides | [x] | `InfiniteCanvas` ResizeHandleKind |
| 5 | Markdown formatted | [x] | `MarkdownView` + soft truncate |
| 6 | PDFs in cards | [x] | Card chrome + `PdfReaderModal`; large → external |
| 7 | Polished appearance | [x] | Tokens, disclosure, no emoji glyphs |
| 8 | Haptics | [x] | `haptics.ts` + Reduce Motion |
| 9 | 2-finger nav priority | [x] | `twoFingerNav` always composed |
| 10 | Panel collision | [x] | `panelLayout` + slots: toast/toolbar/minimap/exit/color/format/zoom/selection |
| 11 | Palette folded + persist + frame/body | [x] | `VerticalColorPalette` |
| 12 | Water-flow glowing arrows | [x] | Animated dash on glowing connectors |
| 13 | Mind-map collapse/depth/tidy | [x] | `mindMap.ts`, MindMapToolbar |
| 14 | Region bg takeover | [x] | `enterRegion` + ExitRegionChip |
| 15 | Connector long-press edit | [x] | FloatingActionSheet |
| 16 | Compact 3-button add | [x] | `ContextualAddMenu` |
| 17 | Top toast + Undo | [x] | `Toast.tsx` |
| 18 | Large MD/PDF soft handling | [x] | MD truncate; PDF >80 pages → external |
| 19 | JSON Canvas lossless | [x] | node + edge `metadata.fieldnote` (thickness/glow) |
| 20 | Composed UX | [x] | Disclosure + collision + What’s New |

## UI improvements → status

| Item | Status |
|------|--------|
| Vertical collapsible palette | [x] |
| Floating panel collision engine | [x] |
| Compact text format panel | [x] |
| Top notifications + Undo | [x] |
| Infinite zoom Android multi-touch | [x] |
| Resizable cards | [x] |
| Formatted Markdown | [x] |
| PDFs in cards | [x] |
| 3s glow + haptic complete | [x] |
| Water-flow deps | [x] |
| Mind-map collapse + depth + Tidy | [x] |
| Colored regions (nested parenting) | [x] |
| Compact 3-button long-press add | [x] |
| Haptics on meaningful actions | [x] |
| Calm HIG-like design | [x] |
| Safe-area + keyboard chrome | [x] |
| No system Alerts routine | [x] |
| Minimap hidden while editing | [x] |
| Toolbar icon-only + tip toast + persist | [x] |
| Edge sheets bottom / right ≥600 | [x] |
| Import Merge default + Replace | [x] |
| Media → documentDirectory | [x] |

---

## Definition of Done

- [x] Batches 0–12 implemented in code
- [x] `npx tsc --noEmit` clean
- [x] `npm test` green
- [x] Gesture contract preserved (pan default)
- [x] App launches on Android (1.6.1+; expo-av removed)
- [x] EAS preview APK linked on PR
- [x] `docs/QA_MATRIX.md` filled for device pass marks

## Known deferred (post Finish Line / optional)

- Native first-page PDF raster into `coverUri` (decorative preview is fine)
- Full canvas virtualization for hundreds of items
- Saved strokes as Skia (live path is Skia; committed paths remain SVG)
