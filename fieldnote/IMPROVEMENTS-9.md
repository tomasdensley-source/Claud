# Fieldnote improvements — v1.5.1

## Gestures (this release)
1. **Pinch no longer drifts sideways** — pinch is the sole writer of translate during zoom (`zoomAboutStartFocal`); two-finger pan yields while pinching and resyncs its baseline.
2. **Default one-finger pan** — empty-space drag pans the board like a map.
3. **Multi is opt-in** — turn on Multi for marquee / additive select; then pan requires two fingers.
4. Gesture help copy + blueprint updated to match.

## From v1.5.0 (Combined Plan)
Executed Combined Plan batches 0–11 toward blueprint calm+correct canvas.

### Correctness
1. `deleteItems(ids)` — no stale select-then-delete
2. Graph hygiene prune/remap/ensureUniqueIds/expandMindMapSelection
3. Missing task deps treated as satisfied
4. Mind-map collapse respects depth All
5. `createMindMapTree` real child nodes
6. Duplicate remaps graph + expands mindmap subtree
7. HistoryEntry restores `currentBoardId` + selection
8. Edit-session history on `setEditingId`
9. Task edit when done/blocked (hold unchanged for active)
10. Nav overlay Simultaneous with draw; draw `onFinalize`
11. Live connector drag offsets
12. Region `assignRegionParents` on drag end
13. Import id uniqueness
14. JSON Canvas `metadata.fieldnote` round-trip
15. Landmark SQLite `zoom` column + migration
16. Media copy to documentDirectory (soft)

### UI
17. ChromeLayoutProvider + disclosure modes
18. FloatingActionSheet replaces canvas Alerts
19. Contextual add root/device/new submenus
20. ModalShell edge variant
21. Icon-only toolbar + Multi badge + persist collapse
22. Single zoom/selection bar
23. Draw width-only palette; body color paints paths
24. Shape stroke uses item.color
25. TextFormat progressive + Edit
26. Frame/Body allowedTargets
27. MindMapToolbar (child/sibling/tidy/depth/collapse)
28. PDF Open wired; PdfReaderModal resets on uri
29. Softer selection chrome
30. Toast Undo dismisses; pause on press

See `docs/COMBINED_PLAN.md` for full contract and Phase 2 parking lot.
