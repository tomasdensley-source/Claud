# The Fieldnote record: a run as a file the app imports

A Ladder run's required output includes one file that the Fieldnote app imports as a new Tree. It is a **LadderRecord v1**, schema `03_SCHEMA/record.ts` in `@fieldnote/ladder-core` 0.5.1. This file says how every Ladder object maps into that record, and how the file is proved importable before it is delivered.

The reference implementation is `tools/export_fieldnote.py`. It reads the normalised run data written by the run's diagram builder (`ladder_data.json`). It is a reference, and a run with another record layout adapts it. Every rule below still binds.

## 1. The record

```
{ "version": 1, "panels": [...], "observations": [...], "groups": [...], "abstractions": [...],
  "implications": [...], "tests": [...], "convergences": [...], "invariants": [...], "repairs": [...],
  "edges": [...] }
```

* Export a **bare record**. The app's own exports are bare, and 0.6.0 readers accept only bare records.
* The app also accepts the envelope `{"format":"fieldnote.ladder","formatVersion":1,"record":{...}}`.
* The board camera (`board`) may be included, but the app drops it on import.
* Unknown fields survive import.

## 2. IDs

IDs MUST match the app's patterns:

| Kind | Pattern | Example |
|---|---|---|
| panel | `P-\d{4,}` | P-0001 |
| observation | `O-\d{4,}` | O-0001 |
| group | `G-\d{3,}` | G-001 |
| abstraction | `A-\d{3,}` | A-001 |
| implication | `I-\d{4,}` | I-0001 |
| test | `T-\d{4,}` | T-0001 |
| repair | `R-\d{3,}` | R-001 |
| convergence | `C-\d{3,}` | C-001 |
| invariant | `INV-\d{2,}` | INV-01 |

* Edges are `E-00001` and up.
* A run label that does not fit its kind's pattern (`A-013v2`, `REV-33`, `D-20v8`, `S-001.a`, `E-7v2`, `CX-118`) MUST keep its place in the run as a tag, `run:<label>`. The object gets the next free ID of its kind.
* The object also carries `pass:<panel>`.
* Run IDs that already fit (O-nnnn, G-nnn, A-nnn) are kept unchanged.

## 3. Mapping

| Ladder object | Fieldnote object |
|---|---|
| Observation (L0) | `observation`. `text` is verbatim. `provenance.source` is the run's provenance column. `groupIds` holds every group it belongs to. |
| Group (L0.5) | `group`. `tag` is the group's name, `basis: "instinct"`. `memberIds` holds observations, or survivor abstractions at higher tiers. |
| Each pass or diagram | One `group` named for the pass (`basis: "topical"`), whose members are the observations first recorded in that pass. It is the source group of that pass's claims, definitions and revisions. Also one note `panel` with the pass's title and summary, placed above its district. |
| The piece (P00) | A note `panel` ("The piece (P00), verbatim"). A note is planning, not evidence. |
| Claim, assumption, definition, reformulation, abstraction, repaired sentence, revision (REV) | `abstraction`, with `statement` as the exact sentence, `sourceGroupId` as its group, and `tier` 1 (2 for a revision). |
| Surplus implication (L2, IMP) | `implication`, `surplus: true`, with its parent abstraction. |
| Entailment conditional (E-*) | `implication`, `surplus: false`, whose parent is its pass's revision. |
| A Counter-AI verdict | `test`, `channel: "external"`. The result is `holds` for STANDS and `false` for BROKEN. `testedAt` is the run's meta time. `evidenceNote` is the run ID, the verdict, "The verdict belongs to this exact sentence only", and a short excerpt. `notes` holds the full reply. |
| A fresh audit (P4) | `test` with result `holds` (DEMONSTRATED), `insufficient_evidence` (CONTESTED) or `false` (FALSE AS STATED). The evidence note says it is an audit under an interim prompt, not the fixed Counter-AI prompt. |
| A sentence tested directly | Fieldnote tests attach to implications, so the abstraction gets one implication carrying its own words (`surplus: false`, tag `direct test`), and every verdict it faced hangs on that implication. A direct test is not surplus, so it carries no weight toward an invariant (schema gate `surplusRequiredForWeight`). |
| Narrow / Split | `repair`, `outcome: "narrow"` or `"split"`, with `targetAbstractionId`, `resultingAbstractionIds`, `antiAdHocReceipt` (the receipts), and `facesFreshSurplus: true` once a result has been tested. The named loss goes in `notes`. The parent is archived with status `narrowed` or `split`. Each child gets `parentId`. |
| Discard | `repair`, `outcome: "discard"`, `resultingAbstractionIds: []`. The abstraction is archived with status `discarded` and a `death` record. Discard archives; it never deletes. |
| A version chain across passes (`X-nnvK` from `X-nnv(K-1)`) | A repair from the earlier version, with the row's receipt. |
| A definition valid by ruling (for example ruling R-S, scripture) | `abstraction`, status `live`, tag `ruling:R-S (scripture); untested`, and **no test**. |
| An invalid derivation | `implication` with status `invalid_derivation`, archived. Any verdict it faced stays attached. |

## 4. Statuses

* An abstraction whose latest verdict STANDS is `tested_live`.
* One repaired by Narrow or Split is `narrowed` or `split`, and archived. One discarded is `discarded`, and archived.
* Every other abstraction is `live`, including untested ones and ones whose implication failed but are not yet repaired.
* An implication's `status` MUST equal the result of its latest test. With no test it is `untested`. The app refuses `holds` or `false` without a matching test: "Untested is not passed."
* An object tested more than once carries every verdict, in run order. Its status follows the latest Counter-AI verdict.

## 5. Edges

Edge endpoints MUST be ones the app allows:

| Edge kind | From | To |
|---|---|---|
| `member_of` | observation or abstraction | group |
| `source_of` | group | abstraction |
| `entails` | abstraction | implication |
| `tested_by` | implication | test |
| `killed_by` | abstraction or implication | the failing test |
| `predecessor` | abstraction | repair |
| `successor` | repair | abstraction |
| `supports` | observation | repair (a receipt) |
| `related` | anything | anything (every other relation in the run's diagram) |

## 6. Layout: the schedule

* Every object gets a `layout` point (the plate anchor), and a `boardSize` when its text needs more than 220 by 108.
* The arrangement is the schedule in `fieldnote-board.md` §1a: one band per pass, the first at the bottom and the latest at the top.
* Each object carries `band:<pass>`, and each pass heading carries `heading`. An observation shown with its named group in a later pass also carries `recorded:<pass>`.
* A direct-test implication's `statement` is a short pointer ("REV-33 itself, tested word for word. Its exact sentence is on A-141."). Its `notes` hold the exact sentence, which lives on the abstraction: one sentence, one place.
* No two plates may overlap at their stated sizes, and this MUST be checked mechanically.

## 7. Proving the file imports (MUST, before delivery)

1. **Use the app's own code when it is reachable.**
   * Download `fieldnote-ladder-core-<version>.tgz` from the Field Notes folder.
   * Unpack it into its own scratch directory.
   * Install `tsx` in a separate directory.
   * Run `prepareImport` from `src/store/record-io.ts` on the file.
   * File its output verbatim: `prepareImport: ACCEPTED {counts}`, or the refusal message.
2. **Otherwise run `tools/validate_fieldnote_record.mjs FILE.json`.** It is a no-dependency port of `parseRecord`, `validateRecord` and `prepareImport`. On Nov 27, 2026 it agreed with ladder-core 0.5.1 on the run's file and on 15 files broken one rule at a time (15/15 the same). The one wording difference: for a file that is not JSON at all, the port gives its own message.
3. **Cross-check the tally.** Every valid Counter-AI verdict in the run's tally MUST appear in the file as a test with the same result. The count of verdicts missing MUST be 0, and the check's output filed.
4. **A refused file is NOT DONE.** It MUST NOT be delivered as importable.

## 8. The board page

`tools/build_board.py RECORD.json OUT.html "Tree name"` embeds the record into `tools/fieldnote_board_template.html`. The page draws the board as `fieldnote-board.md` specifies, saves the record for Fieldnote, and takes more Fieldnote files in, either as new Trees or added onto this one. A file added onto a Tree is renumbered and checked against the import rules again. A file the page saves after adding MUST still pass §7.
