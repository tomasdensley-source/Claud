# The Fieldnote board: how a run's HTML MUST look

Source authority for this file: the Fieldnote app (package `com.ladder.mothertree`, 0.8.7 vc26) and its engine `@fieldnote/ladder-core` 0.5.1, read from the author's Drive folder "Field Notes" on Nov 27, 2026. These sources were used: `palette-preview.png` ("Fieldnote stage colours"), the QA screenshots of 0.8.5 to 0.8.7, `ZOOM_READOUT_SPEC.md`, `LADDER_CORE_README.md`, and the ladder-core modules `board-geometry.ts`, `group-colors.ts`, `color-model.ts`, `zoom-bands.ts`, `zoom-readout.ts`, `camera.ts` and `model.ts`. Where this file and the app disagree, the app governs, and the disagreement is a defect in this file that MUST be logged.

The reference implementation is `tools/fieldnote_board_template.html`. `tools/build_board.py` builds it around a record. A run SHOULD use the template unchanged. A run that changes it MUST keep every MUST below.

## 1. What the page is

1. The page is one Fieldnote Tree, drawn the way the app draws its board. It is not a report layout with columns. It is an infinite board of plates that you pan and zoom.
2. The page MUST embed exactly one Fieldnote record (LadderRecord v1, see `fieldnote-record.md`). It MUST draw only from that record: every plate, region and cord on screen is an object or edge in the record. Nothing on the board is drawn from anywhere else.
3. The page MUST be able to save the record as a Fieldnote import file, and MUST be able to take Fieldnote files in, either as new Trees or added onto the current Tree (§7).

## 2. Board

| Token | Value |
|---|---|
| Board paper (`theme.paper`) | `#F8F7F3` |
| Dot grid | 1 px dots, `rgba(60,58,48,.17)`, 24 world units apart. The on-screen spacing is doubled or halved to stay between 14 and 56 px. The grid moves with the camera. |
| Wash | Soft radial washes over the paper: peach top left, lavender bottom right, mint left, apricot right. Each at about 0.26 to 0.38 alpha. |
| Ink (`theme.ink`) | `#22231F` |
| Hairline (`theme.line`) | `#DAD8CF` |
| Failure red (`theme.red`) | `#EF263F` |
| App green (chrome) | `#2C5A47`, with soft `#E6EFE8` |
| Type | DM Sans for everything on the board and in the chrome; Source Serif 4 for sheet titles and Tree names |

## 3. Plates

Geometry comes from `board-geometry.ts`, and these values MUST NOT change:

* A plate is 220 wide unless the object has a `boardSize` (150 to 1200 by 100 to 1000).
* Its stored `layout` point is the plate's anchor, at (110, 54) from its top left. The plate's top left is therefore `(layout.x - 110, layout.y - 54)`.
* The fallback height is 108. A plate grows with its text, and its measured size is what regions and ports use.
* An object with no `layout` is placed by the app's tier layout (`positionNodes`). Each tier is a lane: `x = index * 280`, `y = -tier * 220`. The tiers are:
  * notes and observations: 0
  * groups: tier + 0.65
  * abstractions: tier + 1
  * implications: their parent's tier + 0.25
  * tests: -0.8
  * repairs: -1.7
  * convergences and invariants: 4

Anatomy, from the app's screenshots:

1. **Header row.** The kind glyph (12 dp, in the kind's accent), then the kind name in bold in the kind's ink, then the ID right-aligned in muted text. The reference page also shows the run's own label before the ID (for example `REV-33 · A-141`). The run label comes from the object's `run:` tag.
2. **Text.** `titleOf(object)`: a note's title, an observation's text, a statement, a group's tag, a test's evidence note, or a repair's receipt. Shown at 15 px with line height 1.42, wrapping.
3. **Status line.** `statusOf(object)` in muted 12 px text, for example `tested live`, `holds`, `false`, `narrowed`, `Regular`. A draft reads `Draft · tap to add details`. A `false` result is shown in red ink.
4. **Shape.** Rounded rectangles with a radius of about 26. An observation is a softer squircle, radius about 46/52.
5. **Shadow.** A low, warm shadow. An archived object (discarded, narrowed, split) stays on the board at half opacity. Discard archives; it never deletes.

Stage colours (palette-preview, density 3.0). Every value MUST be used exactly:

| Kind | Glyph | Accent | Plate fill | Plate border |
|---|---|---|---|---|
| Observation | circle | `#E2AE00` | `#FFE36E` | `#D6A300` |
| Group | hexagon | `#219C9B` | `#EEF5EF` | `#97B7A0` |
| Abstraction | triangle | `#8741DA` | `#E5D3FB` | `#8741DA` |
| Implication | square | `#236D50` | `#E2F1E8` | `#236D50` |
| Test | octagon | `#91B5CE` | `#DBE9F3` | `#91B5CE` |
| Repair | trapezoid | `#C77E00` (repairAmber) | `#FBEFE1` | `#D7B285` |
| Convergence | hourglass | `#C340B1` | `#F4F2EE` | `#BDB9B2` |
| Invariant | cross, outline only | `#997405` (1 dp gold border only) | `#F7F5EF` | `#997405` |
| Note / Task (panel) | diamond | `#DF844B` | `#FFDBBB` | `#E08A55` |

The glyph silhouettes are the app's `overviewMarkPath` shapes, and they MUST be reused, not redrawn.

## 4. Group regions

* A group with at least one displayed member is drawn as a region, not a plate. The region is the members' plate bounds plus 18 on every side (`groupRegion`).
* Membership is explicit: overlapping a region never adds a member.
* The region has a dashed outline in the group's outline colour and a light wash of the same colour.
* Its tab is a pill at the region's top centre (`groupLabelPoint`), showing the colour swatch and the group's tag.
* A group with no displayed members is drawn as a plate at its own stored position.
* Group colour: a valid `tagColor` is kept exactly. Otherwise the colour comes from the app's open sequence: hue `147 + i * 137.50776405003785`, with saturation and value varied as in `group-colors.ts`. The index is G-number minus 1, or an FNV hash for any other ID.

## 5. Cords (edges)

* A cord leaves the port facing the other plate (`nearestPort`, over the top, right, bottom and left mid-points) and curves into the facing port of the other plate.
* `member_of` is shown by the region, not by a cord.
* Cord styles:

| Edge kind | Style |
|---|---|
| `killed_by` | the failed path cord: failure red `#EF263F`, normal width, dash [8,3] |
| `entails` | implication green, solid |
| `tested_by` | test blue, solid |
| `predecessor`, `successor` | repair amber, solid |
| `supports` | gold, dotted |
| `source_of` | group teal, light |
| `related` | grey, dashed, drawn only from the plates band up or when showing one plate's links |

## 6. Zoom bands and camera

The zoom bands come from `zoom-bands.ts`, and MUST NOT change:

| Band | Zoom | What is drawn |
|---|---|---|
| B0 Field | 1% to 4% | glyphs and group fields |
| B1 Map | 4% to 24% | glyphs at screen size, cords, regions |
| B2 Plates | 24% to 80% | plates |
| B3 Reading | 80% to 10,000% | plates at reading size |

* Changing bands uses hysteresis of x1.05.
* Each boundary cross-fades across a window of 1.6x (smoothstep in log zoom). The plates' opacity is B2 + B3, and the glyphs' opacity is B0 + B1.
* Plates take taps once their opacity reaches 0.5. Below that, the nearest glyph within 14 px takes the tap.
* Zoom is clamped to 0.01 to 100.
* Pinch and wheel zoom about the focal point (`zoomAt`).
* Fit frames every object.
* Double-tap, or Focus, frames one plate and never lands below 84% (80% x 1.05), so it always lands in B3.
* The zoom readout reads like `24.0% · B2`, using `formatZoomReadout`:
  * one decimal below 100%, whole numbers with commas from 100%;
  * 12 px ink on paper at 88%, with a hairline border;
  * 12 px from the left, 118 px below the top;
  * off by default, and switched on in the ⋯ sheet ("Show zoom readout"). The setting is saved as `fieldnote.ui.zoomReadout.v1` = `"true"`.

## 7. Chrome and controls

The chrome matches the app's screenshots:

1. **Top left: the Tree pill.** It holds a tree glyph in a soft green square, the Tree's name in bold, and a chevron. Tapping it opens the **Your Trees** sheet:
   * a caps label `FIELDNOTE`, a serif title `Your Trees` and a green `Exit` button;
   * one card per Tree, with the current Tree outlined in green and checked;
   * `Save for Fieldnote` and `Import a Fieldnote file`.
2. **Top right: a round ⋯ button.** It opens the Workspace tools sheet ("View the whole"): import, save, fit, the zoom readout toggle, and the colour key.
3. **Bottom left: a tool pill** with Fit, Box select, Find and Link:
   * Box select drags a marquee that selects every plate it touches.
   * Find searches text, IDs and labels.
   * Link shows only the selected plate's links and dims the rest.
4. **Bottom right: a dark green `+ Add` button.** It takes a Fieldnote file in. On a phone it is a round `+`.
5. **Tapping a plate** opens its sheet:
   * the kind and ID as a caps label, then the full text and a status badge;
   * the kind's fields (provenance, tier, source group, surplus, result, channel, receipt);
   * the notes, which for a test are the full Counter-AI reply;
   * every link, each of which can be tapped to go to it.
6. **Phone width.** No horizontal page scroll. The tools and `+` button fit on one row at 390 px.

## 8. Files in and out

1. **Save.** Saving writes the current Tree as a bare LadderRecord, pretty-printed, with the camera in `board`. The file is named `fieldnote-<tree>-YYYY-MM-DD.json` (`exportFileName`). The app imports it as a new Tree named `Imported · <file name>`.
2. **Taking a file in.** The file goes through the same import rules as the app (`prepareImport`: 25 MB limit, bare record or `fieldnote.ladder` envelope, `parseRecord`, then `validateRecord`). A refused file shows the app's message and changes nothing.
3. **Open as a new Tree.** The file becomes a new Tree in the page.
4. **Add onto this Tree.** This is building onto a later pass:
   * every incoming object gets a fresh ID after the current maximum for its prefix, and every reference and link follows it;
   * the incoming board is placed to the right of the current one;
   * the result passes the import rules again before it is kept.
5. **Trees taken in are kept only in this browser.** They live in `localStorage` (`fieldnote.web.trees.v1`) as a convenience, and that storage can be lost. The saved file is the durable copy.

## 9. MUST NOT

* MUST NOT draw a plate, region or cord that is not in the record.
* MUST NOT show an untested object as passing, or colour a valid-by-ruling definition as a pass. An object valid by ruling (for example ruling R-S) shows the badge `valid by ruling · untested`.
* MUST NOT hide archived objects, or a failed path cord.
* MUST NOT change the stage colours, plate geometry, zoom bands or file name rule above without a changelog entry in the skill file (§16).
