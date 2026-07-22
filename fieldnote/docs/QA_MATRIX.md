# Fieldnote Android verification matrix

Device QA for Combined Plan / Phase 2 builds. Uninstall older APK before each install.

## Build under test
- Version: 1.5.2
- Build URL: ______
- Device / OS: ______

## Gestures
| # | Case | Pass |
|---|------|------|
| G1 | Pinch zoom empty canvas — no sideways drift | |
| G2 | Pinch starting on text card | |
| G3 | Default one-finger empty = pan | |
| G4 | Multi ON → one-finger marquee; two-finger pan | |
| G5 | One-finger object = move | |
| G6 | Draw → 2nd finger pans; no ghost stroke | |
| G7 | Long-press empty → 3-button add | |
| G8 | Lasso tool selects by freehand loop | |
| G9 | Alignment guides appear when dragging near neighbors | |

## Tasks / mind maps
| # | Case | Pass |
|---|------|------|
| T1 | Hold incomplete task 3s → complete | |
| T2 | Dependent blocked until upstream done | |
| T3 | Delete upstream → dependent completable | |
| T4 | Collapse at depth All hides children | |
| T5 | Add Mind Map → 3 real nodes | |
| T6 | MindMapToolbar child/sibling/tidy | |
| T7 | Edit text → Undo restores | |
| T8 | New board → Undo → edits persist | |

## Chrome / UI
| # | Case | Pass |
|---|------|------|
| U1 | Format + Minimap both visible | |
| U2 | Exit region chip clear of toolbar | |
| U3 | Corner long-press menu fully on-screen | |
| U4 | Toast Undo undoes + dismisses | |
| U5 | No system Alert for stroke/connector/region/add/places/boards/paste | |
| U6 | Multi badge shows count | |
| U7 | One bottom bar (not stacked) | |
| U8 | Draw mode: one color UI + width | |
| U9 | Keyboard edit: format reachable | |
| U10 | Lock selected — cannot drag or resize | |

## Data
| # | Case | Pass |
|---|------|------|
| D1 | PDF Open works | |
| D2 | Place at 200% → relaunch → zoom restored | |
| D3 | Import same .canvas twice — unique ids | |
| D4 | Recovery snapshots restore (More → Snapshots) | |
| D5 | Paste AI Merge vs Replace (both snapshot first) | |

## Non-regress
| # | Case | Pass |
|---|------|------|
| N1 | Fit / zoom buttons | |
| N2 | Reduce Motion mutes haptics | |
| N3 | Water-flow demo still readable | |

## Sign-off
Tester: ______  Date: ______
