# Fieldnote Improvements

1. Added viewport culling so only canvas items intersecting the camera plus padding render.
2. Replaced the fixed 2800 world box with absolute positioning on an unbounded canvas transform.
3. Added sparse visible dot grid rendering without a large SVG pattern.
4. Added Reanimated pan inertia with friction after navigation release.
5. Kept pinch and pan simultaneous so two-finger navigation remains available.
6. Ensured two-finger navigation still wins while draw mode is active.
7. Added minimum and maximum zoom limits of 0.2 to 2.8.
8. Added guards for invalid or empty viewport dimensions.
9. Added transform reporting for zoom indicators and view-center placement.
10. Added fit-board padding for better framed board views.
11. Added fit-selection behavior from the selection toolbar and Fit long-press.
12. Added semantic zoom that hides fine card details under low scale.
13. Added scale-aware selection handle sizing.
14. Added selection glow and border using the theme selection color.
15. Reduced card shadow cost when boards contain many items.
16. Memoized canvas item rendering with React.memo.
17. Added selected-item z-index bumping when cards are selected.
18. Added single-history drag commits after drag previews finish.
19. Added mind-map subtree movement when dragging a parent node.
20. Added accidental region drag prevention unless the region is already selected.
21. Added tap-empty behavior that clears selection.
22. Removed long-press-empty Add behavior to prevent accidental panels.
23. Added double-tap-empty behavior to open Add.
24. Added marquee selection by dragging empty space in Multi mode.
25. Added additive Multi selection toggling for tapped and marquee-selected cards.
26. Added a selected-count badge on the Multi toolbar button.
27. Added automatic deselection when entering draw mode.
28. Added minimum-size hit targets and hit slop on chrome controls.
29. Added long-press card editing with haptic feedback.
30. Added haptic feedback on color, draw-width, drop, connect, and confirm actions.
31. Added expo-haptics as an app dependency.
32. Added a global toast host with auto-dismiss.
33. Added undo action toast after deleting selected items.
34. Added redo and undo completion toasts.
35. Added multi-delete confirmation before deleting several cards.
36. Added a centered empty-board Add button.
37. Added stronger empty-board copy that explains double-tap Add.
38. Added a draw-mode banner explaining two-finger navigation.
39. Added an onboarding tip banner persisted with AsyncStorage.
40. Added a skip-tips action for onboarding.
41. Added hardware Back handling that closes open panels first.
42. Added inline board rename from the current-board badge.
43. Added an autosave dot and save pulse state on the current-board badge.
44. Added AppState save flushing on inactive and background transitions.
45. Added separately persisted working-file records.
46. Added storage schema versioning for board saves.
47. Added migration from legacy mind-map children strings to parent-linked nodes.
48. Added corrupt JSON recovery notification through toast.
49. Added current-board fallback guarding to avoid undefined-board crashes.
50. Added reset-to-board behavior in the canvas error boundary.
51. Added real MindMapItem parentId fields.
52. Added MindMapItem collapsed state.
53. Added MindMapItem branchColor fields.
54. Added add-child actions for selected mind-map nodes.
55. Added add-sibling actions for selected mind-map nodes.
56. Added collapse and expand actions for selected mind-map nodes.
57. Added hidden-descendant filtering for collapsed mind-map branches.
58. Added a tidy mind-map layout helper for child nodes.
59. Added curved connector overlays between mind-map parents and children.
60. Added a scientific-method template with a root and nineteen child nodes.
61. Added TaskItem dependsOn arrays.
62. Added TaskItem state values for blocked, ready, and done.
63. Added blocked-task prevention when dependencies are incomplete.
64. Added downstream task uncheck reset when an upstream task is unchecked.
65. Added visual blocked, ready, and done task styling.
66. Added done-task connector glow when upstream work is complete.
67. Added connector dots on all selected cards.
68. Added task-to-task dependency creation through connector dots.
69. Added dependency cycle detection with toast feedback.
70. Added absolute SVG connector overlays between dependent tasks.
71. Added a vertical color palette for draw mode and colorable selections.
72. Added palette colors from the shared PALETTE theme array.
73. Added draw width choices of 2, 3, 6, and 10.
74. Added draw eraser mode using canvas-colored strokes.
75. Added translucent highlighter drawing mode.
76. Added round line caps and joins to drawing strokes.
77. Added drawing finalization that clears the active drawing id on release.
78. Added shapes to the Add panel.
79. Added regions to the Add panel with dashed borders.
80. Added text, task, mind-map root, and region creation with current-view placement.
81. Added audio stub cards for future audio previews.
82. Added PDF stub cards for future PDF previews.
83. Added markdown stub cards for future markdown previews.
84. Added document picker MIME filters for files.
85. Added image picker support with image metadata.
86. Added image load fallback cards for failed images.
87. Added file-size display on file cards and file lists.
88. Added a working-file library list in the Files panel.
89. Added place-from-library behavior for persisted working files.
90. Added search filters for everything, text, image, file, and task.
91. Added search result counts.
92. Added a clear-search action.
93. Added JSON export through the native Share API.
94. Added JSON import from picked documents.
95. Added duplicate-board support.
96. Added board updated-at relative time labels.
97. Added copy-selection behavior.
98. Added paste-selection behavior.
99. Added lock-selection behavior.
100. Added optional toolbar snapping between the left and right sides.
101. Added active-tool highlight retention across panel changes.
102. Added selection-toolbar actions for fit, copy, paste, lock, duplicate, and delete.
103. Added accessibility labels on primary toolbar and panel controls.
104. Added font-scale clamps for editable text inputs.
105. Added press opacity feedback on canvas cards.
106. Added region opacity and subtle internal dot patterning.
107. Added storage panel counts for boards and items.
108. Added version 1.0.3 display in More.
109. Added README documentation for new gestures and data features.
110. Added automated migration tests for mind maps and task dependency states.
