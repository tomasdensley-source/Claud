---
title: Curation Report — 2026-05-23 (pass 3)
type: report
tags:
  - report
  - curation
updated: 2026-05-23
cssclasses:
  - vq-home
---

# 🧹 Curation Report — 2026-05-23 (pass 3)

A bounded, fully-logged cleanup pass toward the North Star. Every change is in `CURATION_PASS3_2026-05-23.tsv` (`action ⇥ src ⇥ dest/kept ⇥ reason`). Safe/mechanical work was executed; judgment-heavy remainders were **flagged into review queues**, not guessed.

**Net:** 15,356 → **14,957 markdown notes** (−399). Duplicate basenames **450 → 31**. 30 mojibake filenames repaired. 111 broken links auto-fixed.

## Track 1 — Pharmacopoeia near-dup merge
The residual `30_Pharmacopoeia/_pharmacopoeia-vault/` overlapped the categorized, banner-bearing notes.
- **358** byte-shorter near-duplicates dropped (canonical categorized copy kept).
- **22** cases where the vault copy was materially longer → kept as `… (variant).md` beside the canonical with a `[!review]` flag (no content lost).
- **7** misfiled notes relocated: 2 Jung *Liber Novus* compendia → `14_Reading_Quotes_Philosophy/Jung-reference/`; `compounds_batched`/`compounds_extracted`/`plants_of_power…dossier` → `30_Pharmacopoeia/_General/`; `Yopo and Cebíl` → `Pneumatic/` (name de-mojibaked); `compass_artifact_*` → `_attachments/resources/`.
- **4** empty/templated `Untitled` placeholder notes deleted; 2 framework outlines kept + flagged.
- Side effect: this is what dropped duplicate-basenames from 450 to 31.

## Track 2 — Security compartment consolidation
`72_Security_Credentials/` is now the **single canonical home** (its own "one purpose only" doctrine, North Star #63). The **39** identical doctrine/template/index copies a prior pass had scattered into `00_Inbox_Unsorted/` (15), `70_System_Templates/Templates/` (23), and `18_Tech_Reference/INSTALL.md` (1) were removed (verified byte-identical to the `72_` copy first; Templater points at `99_Templates`, so nothing breaks).

## Track 3 — Mojibake filename normalization
747 files had encoding-corrupted names. **30** were repaired where recovery was unambiguous and produced only clean typography/Latin characters (’ – × etc. — e.g. `Don╬ô├ç├ût Look Now` → `Don't Look Now`), with link references rewritten. **717** with emoji-bearing or multiply-garbled names (e.g. `­ƒÆ▓`, `ÔëíãÆ├ª├í…`) were **left as-is and flagged** — renaming to a guess would destroy provenance (#34).

## Track 5 — Link integrity
- **111** dangling links auto-fixed across 66 notes, where a unique existing note matched after case/`.md`/typography normalization (`FQ — …` → `FQ - …`, `templates` → `Templates`).
- Remaining **~14,641 non-image dangling occurrences (5,481 targets)** are genuinely **missing target notes**, dominated by a few: `Source - Universal Codex (Reinforced)` (2,906), `MOCs/MOC - …` indexes, `_Indexes/…`. Creating these would resolve thousands — listed in `[[_LINK_REVIEW_2026-05-23]]` for a decision (not auto-created).
- **31** ambiguous duplicate-basenames listed there too.

## Track 4 — Inbox triage
No safe bulk route exists: the film catalog already lives in `12_Entertainment/`, and the 2,286 inbox notes are heterogeneous residue with no reliable category signal (only ~24 carry a `category:` field, mostly unusable). Auto-routing would misfile, so **nothing was force-sorted**; the full inbox is queued in `[[00_Inbox_Unsorted/_TRIAGE_REVIEW|_TRIAGE_REVIEW]]` for manual triage.

## North Star delta
- **#3 one canonical home** ↑ — pharma near-dups collapsed; Security de-scattered.
- **#1 dangling links** ↑ slightly (111 fixed) — large structural remainder now *visible and queued* (#39 honest reporting, #88 review queue) rather than hidden.
- **#34 provenance / #33 preservation** held — nothing deleted but empty stubs and byte-dupes; longer variants preserved.
- **Open / regressions:** inbox still 2,285 (#30/#91 unfinished); 717 mojibake names + ~5.5k missing-note links queued; 207 banners still blocked on the un-uploaded `Manus_Attachments_A part 12`.

See also `[[_LINK_REVIEW_2026-05-23]]`, `[[00_Inbox_Unsorted/_TRIAGE_REVIEW|_TRIAGE_REVIEW]]`, `[[INTEGRATION_REPORT_2026-05-23]]`, `[[CHANGELOG]]`.
