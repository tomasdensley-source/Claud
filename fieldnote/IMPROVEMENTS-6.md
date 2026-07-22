# Fieldnote improvements 808–907 (v1.1.0)

Solid interaction and reliability improvements shipped with the center-zoom / long-press files rebuild.

1. Fixed viewport gesture plane so pinch/pan use screen-space coordinates.
2. Set transform origin to top-left so zoom math matches the visual transform.
3. Pinch zoom keeps the focal world point under your fingers.
4. Button zoom (+/− / 100%) zooms about the viewport center, not an edge.
5. One-finger-only pan so two-finger pinch no longer fights translation.
6. Pinch active flag blocks pan updates mid-gesture.
7. Shared camera helpers (`camera.ts`) for clamp / fit / center / focal zoom.
8. Screen↔world round-trip helpers used everywhere.
9. Live camera center reported to App for placement.
10. Add/Files place at the live view center, not board bounding-box center.
11. Long-press empty space opens Add-here actions.
12. Long-press → Files picks documents at the press world point.
13. Long-press → Photos places library images at the press point.
14. Long-press → Text note creates a note at the press point.
15. Long-press → More opens the full Add panel.
16. Shared file/photo builders (`files.ts`) for consistent placement.
17. Placement helpers with staggered multi-file offsets.
18. Multi-select group drag moves every selected card together.
19. Dragging a selected card in a multi selection keeps the group.
20. History snapshot taken on first drag move (undo restores pre-drag).
21. Resize via the clay bottom-right handle.
22. Resize history captured at resize start.
23. Drawing strokes expand bounds left/up as well as right/down.
24. Drawing stroke width follows the palette setting.
25. Draw color palette (6 swatches) while Draw tool is active.
26. Draw width buttons (thin / medium / thick).
27. Unselected drawings do not steal taps (pointer pass-through).
28. Larger world (4000²) for room to place content.
29. Subtle paper grid under cards.
30. Initial fit once on first layout only.
31. Orientation changes keep the same world center (no forced re-fit).
32. Fit board uses shared fit math with padding.
33. Zoom clamps unified (0.25–2.5) across pinch and buttons.
34. Zoom % updates after pan end (no stale readout).
35. Camera center updates after pan/pinch end.
36. Toast feedback for place / delete / duplicate.
37. Board badge shows Saved/Local status.
38. Board badge shows current board item count vs total.
39. Undo / Redo on the bottom control bar.
40. Zoom in/out disabled at clamp limits.
41. Selection bar: bring forward / send backward.
42. Duplicate and delete toast confirmations.
43. `beginHistory` API for gesture transactions.
44. `addItems` batch add with one history entry.
45. `selectAll` via long-press Multi tool.
46. Long-press More undoes when history exists.
47. Tool switches clear the open panel.
48. Board switch resets tool to select.
49. Board create/delete clear selection safely.
50. History depth expanded to 50 steps.
51. Autosave debounce ~400ms with lastSavedAt stamp.
52. Storage save failures are soft-warned (no crash).
53. Text edits do not spam undo stack per keystroke.
54. Add panel: rectangles and ellipses.
55. Add panel copy clarifies live camera placement.
56. Files panel jumps camera to the selected file.
57. Files panel uses icons instead of emoji glyphs.
58. Files panel search is trim-insensitive.
59. Files panel shows filtered/total counts.
60. Files upload uses the shared image/file classifier.
61. Gestures help text matches real behavior.
62. Minimap size bumped for easier taps.
63. Minimap colors distinguish files/drawings/images.
64. Toolbar accessibility hints for long-press actions.
65. Error boundary retry still wraps the canvas.
66. Safe area shell preserved for notches.
67. Scale state initialized consistently at 0.7.
68. Viewport size guards against 0-width windows.
69. Drawing pad/buffer around stroke start improved.
70. Folder card copy clarified (label card, not OS folder walk).
71. Multi file place staggers cards so they stay selectable.
72. Photo height respects source aspect ratio.
73. Image MIME types become image cards from document picker.
74. Camera unit tests for clamp / round-trip / focal zoom / fit.
75. Placement helpers kept pure and reusable.
76. Toast auto-dismiss after ~2.2s.
77. Toast ignores touches (does not block canvas).
78. Draw palette positioned clear of the zoom bar.
79. Selection count remains visible above zoom controls.
80. Fit label shortened to keep controls compact.
81. Bring/send z-order adjusts selected cards as a set.
82. Delete clears selection after removal.
83. Duplicate offsets copies by 28px.
84. Reset-to-seed clears tool + panel state.
85. Storage panel still reports board/card totals.
86. Search focus still recenters the camera.
87. Long-press maxDistance keeps accidental pans from firing Add.
88. Tap empty space clears selection outside draw mode.
89. Draw mode: exclusive draw vs pan; pinch still simultaneous.
90. Version bumped to 1.1.0 / versionCode 11.
91. World transform no longer lives on the gesture target (side-zoom root cause).
92. `pinching` shared value finalized even on cancelled pinches.
93. Resize handle visually distinct (clay fill).
94. Decorative corner handles no longer capture touches.
95. Board badge max width widened for save meta.
96. Empty long-press cancel path leaves board unchanged.
97. Add panel onPlaced callbacks for consistent toasts.
98. Files panel onPlaced callbacks for uploads/folders.
99. Canvas item hit wrappers keep drag responders stable.
100. Documented this 1.1.0 interaction pass for future audits.
