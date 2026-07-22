# Fieldnote improvements 938–990 (v1.4.0 → 1.4.2)

1. SQLite dual-write store with AsyncStorage migrate/fallback.
2. Landmarks persistence (SQLite + AsyncStorage).
3. Board archive helpers + recents-sorted boards panel.
4. Duplicate board action.
5. Archive board action (non-destructive).
6. Zoom-into-region camera fit on enter.
7. Region background color takeover while focused.
8. Exit-region control chip.
9. Region Markdown export via share sheet.
10. Region JSON Canvas export via share sheet.
11. Places panel (save/jump/delete landmarks).
12. Drawing stroke long-press edit (width/color/delete).
13. Region long-press enter/export menu.
14. Corner resize handles (NW/NE/SW/SE) via RNGH pans.
15. Resize no longer clipped by overflow:hidden.
16. Resize works outside parent item GestureDetector.
17. Markdown renderer for text cards (headings, lists, bold/italic, code, quotes, links).
18. Auto-detect Markdown syntax and render formatted view.
19. Edit mode shows raw Markdown source.
20. Seed notes include Markdown examples.
21. New text notes default `markdown: true`.
22. Task 3s hold driven by RNGH LongPress (not stolen by 420ms edit).
23. Progressive amber glow during task hold.
24. Draw mode: Exclusive(draw, two-finger pan) + simultaneous pinch.
25. Unselected drawings pass through again for ink/marquee.
26. Camera transformOrigin applied as static style (Android zoom fix).
27. Pinch clamps match button zoom (0.25–2.5).
28. Fit/center/region camera effects no longer re-fire on every item edit.
29. BoardContext `resizeItemBox` for corner-aware x/y/w/h.
30. Share helper accepts filename + mime for Markdown files.
31. BLUEPRINT status: SQLite dual-write, region focus, stroke edit, resize.
32. Markdown unit smoke test.
36. Soft haptic feedback across tools, zoom, select, drag, draw, resize, tasks.
37. Haptic warning on blocked tasks / delete; success on complete / new board.
38. Respects Reduce Motion (mutes haptics when enabled).
39. Mid-hold haptic ticks during the 3s task glow.
40. Compact TextFormatPanel (size, bold, roles, Markdown list/todo wrap).
41. Snap-to-grid on object drop (20px).
42. Mind-map nodes excluded from manual resize handles.
43. Connector midpoint long-press → color/thickness/delete edit.
44. `updateConnectorStyle` in BoardContext.
45. Palette remains folded by default; auto-closes when irrelevant.
46. **Fix zoom crash**: mark camera helpers as Reanimated worklets (pinch called softClampScale on UI thread).
47. **Fix zoom crash**: drop world-sized 4000×4000 connector SVG — per-edge tight bounds.
48. **Fix zoom crash**: live stroke overlay uses stroke bounds, not full-world canvas.
49. **Fix zoom crash**: disable Android hardware texture on world layer while zooming.
50. Images use `resizeMethod="resize"` under camera zoom.
