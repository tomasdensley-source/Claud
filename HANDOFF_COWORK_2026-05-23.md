# HANDOFF — VaridisQuo Vault Restructure (for Claude Cowork)

**Date:** 2026-05-23 · **Branch:** `claude/new-session-JMgv1` · **Vault root in this export:** `✦ My Vault ✦/`
**Progress trackers & tag data:** `_HANDOFF/restructure/` (results TSVs, done-trackers, move-log, master task list)

This document is the full instruction set to **continue the project exactly as designed**. Read it completely before acting.

---

## 1. THE GOAL
Turn this Obsidian vault into a **cognitive prosthetic**: a Zettelkasten whose structure makes ideas *converge onto shared abstractions* so new ideas emerge. Convergence is **discovered**, never imposed. The end state is an abstraction graph: granular tagged ideas → discovered abstractions → reverse-implication tiers (implications → reverse-implications → axioms / load-bearing principles), color-coded.

## 2. CLASS A vs B — the ontological classifier (judge every region by what it DEFINES)
- Defines an **idea** (not a person/place/thing) → **Class A**.
- Defines a **person, place, or thing** → **Class B**.
- Defines **nothing** (filler/boilerplate/nav) → **delete** (rare).
Class A = the convergent layer (gets the deep tagging + convergence + reverse-implication). Class B = utilitarian/reference; may be concatenated "within reason" (e.g. all 2024 financial docs → one file), may keep `_index`/MOC. No maps/indexes for Class A.

## 3. THE TAGGING METHOD — the heart of the project (do this EXACTLY; earlier attempts got it backwards)
**Tag by definition, with emergent (never imposed) convergence.**
- Decompose each note into **regions**. A region = the largest contiguous span (often a single SENTENCE, sometimes a paragraph; for quote lists, **every quote**) that wholly defines ONE thing. A new region starts the moment the text shifts to defining a different thing. Take each note apart like puzzle pieces.
- For EACH region ask ONLY: **"what is this defining?"** Then coin a **FRESH ≤3-word tag** naming it.
- **NEVER consult, recall, or reuse any existing tag list. NEVER aim for consistency or convergence while tagging.** If two regions coincidentally get the same words, fine — never force it. Coining a unique tag for every sentence is welcome.
- **BE EXHAUSTIVE / MAXIMAL.** The target is on the order of **one million tags**. A tag for **≥80% of all quotes**. A dense book chapter should yield **~50 tags**. Do NOT sample, summarize, or collapse collections — tag quote-by-quote, idea-by-idea.
- Class each region A/B/delete (rule §2). Never alter body text. Preserve any legacy "## Upward Abstraction Link" lines.
- Record every region as a TSV row: `note_path<TAB>class<TAB>coined_tag<TAB>excerpt(~12 words)`. For short conceptual notes, also stamp frontmatter `class:` + `tags:`. For huge collections/books, the TSV is the record (don't bloat frontmatter with thousands of tags).

### The exact agent prompt template (per chunk / per note)
> You are decomposing text into definition-regions and tagging each with a FRESHLY COINED ≤3-word term — the OPPOSITE of reusing a vocabulary. There is intentionally NO vocabulary file. For each region ask ONLY "what is this defining?" and coin a fresh ≤3-word tag; never look at/reuse any other tag; never aim for convergence (coincidental repeats are fine). Class: idea→A, person/place/thing→B, nothing→delete. Be EXHAUSTIVE (every quote, every distinct idea — a chapter ≈ 50 tags). Never change body text. Write rows `note_path<TAB>class<TAB>coined_tag<TAB>excerpt` to a TSV.

## 4. CONVERGENCE — happens ONLY after ALL tagging is 100% complete (strict sequencing)
One stage fully finished before the next. When tagging is entirely done:
- Cluster the raw tag set to find where independently-coined tags are **moving in the same direction**. **Converge upon whatever actually converges** — do NOT map clusters onto words that already exist, and do NOT reach for culturally-familiar/conventional concepts.
- Where a cluster genuinely coheres, **formulate NEW vocabulary** — coin a brand-new term invented to fit what converged — rather than borrowing an existing/cultural label. The emergent abstraction names itself from the data.
- Log every cluster→new-term in the move-log. Then: build one note per converged term (concatenate its regions with `origin:` refs), wire reverse-implication links between tag-notes, surface L2 "converged" / L3 "invariant"/axiom tiers (user confirms upper tiers), recolor by tier.

## 5. THE JORDAN PETERSON PRESUPPOSITION TASK (DONE — pattern to reuse)
Principle: **"to presuppose is to reverse-imply."** When the text says "X presupposes Y," X is the **child**, Y is the **parent** (X presupposes → Y). Capture EVERY form, not just the literal word: presuppose/presupposition, presume/presumption, assume/assumption, predicated-on, rests-on, depends-on, grounded-in, requires, implies-that, precondition-for. Skip filler ("I assume", "let us suppose"). Output per book: `### line N` + Child / Parent / `[[X]] presupposes → [[Y]]` link + 1–2 sentence description.
**Completed notes:** `✦ My Vault ✦/Complete_Works/Peterson/_presuppositions/` — Maps of Meaning (243), 12 Rules for Life (248), Beyond Order (180) ≈ **~650 reverse-implications** (vs 81 literal "presuppose" hits). Apply this same presupposition-mining to other authors if desired.

## 6. CURRENT PROGRESS (what's done / what remains)
**Done:**
- Stage 0 (demolition): stripped ~7,440 noise reverse-implication footers, removed 884 auto-indexes + 95 Class-A MOCs + 230 dupes.
- Stage 1 (dedup + cull): removed 41,621 duplicate blocks, culled 8,045 hollow shells → vault 15,463 → ~5,700 notes. Attachments preserved. Everything logged in `_HANDOFF/restructure/MOVE_LOG.tsv`.
- Routing: ~5,544 utilitarian notes set Class B; ~1,246 genuine conceptual notes isolated.
- **Conceptual tagging (Stage 2R) COMPLETE** — all 1,246 conceptual notes fresh-region-tagged (frontmatter `class:`+`tags:` set). Results: `_HANDOFF/restructure/results/fresh_batch_*.tsv`.
- Peterson presupposition audit COMPLETE (§5).
- Demo cruft culled: `50_Implications_Zettelkasten/example-zettel-demo/` (501 imported algebra/fantasy tutorial notes).
- 12 PDFs converted to `.md` (this export is markdown-only).
- **Long-form exhaustive tagging IN PROGRESS** (~3,800+ region-tags so far): DONE = Ontology essay (`Universal_Codex_Ontology_of_the_Void_IDEAS_ONLY.md`, ~700 tags), Very large quote list (1,034), unique-quote compendium (~1,666). Results in `_HANDOFF/restructure/results/lf_*.tsv` and `longform_*.tsv`.

**Remaining long-form (the big multi-session push):** see `_HANDOFF/restructure/longform_chunks/master_tasks.json` (1,318 chunks total) minus `done_chunks.txt`. ~1,100 chunks remain: the other quote lists (`quote_compendium_25k_30k`, `quotes_dedup_no_squares`, `Quotes_Doubled_Final`, rest of `Quotes List`), then the **full books** in `Complete_Works/` (Maps of Meaning ~134 chunks, Jung CW ~227, Gorky 71, 12 Rules 71, Beyond Order 67), `15_Writing_Literature` stories, and the user's essays. **Skip:** SPEECHIFY/ULTRACLEAN essay format-duplicates and the `23_Backrooms_Novel` machine-generated prompt catalogs (~900 byte-identical templates each — tag only their genuine definitional regions). Skip hash-`[HASH]`-suffixed duplicate files.

## 7. HOW TO RESUME (mechanics)
- Master chunk list: `_HANDOFF/restructure/longform_chunks/master_tasks.json` (each = `{note,start,end}`, ~1,800 words/chunk). Completed: `done_chunks.txt` (key = `note|start|end`).
- For each remaining chunk, launch an agent with the §3 prompt + the quote-list variant for quote files; agent reads the line range and writes `results/lf_<tag>.tsv`. Run ~8 chunks/wave; after each wave, append finished keys to `done_chunks.txt` and re-pick (quote lists first, then books, skip groups 8/9 = Backrooms/hash-dups).
- Note-ID convention (from the vault's own protocol §0G/§0I): `Z`-prefix namespace, Protocol-Zeta ops (deduction `-N`, sibling letter, abstraction `_N`); `#### N-M` codex entry IDs; titles/IDs of surviving notes never change. Keep all moves in the move-log.

## 8. INVARIANTS (do not violate)
No body text deleted (only frontmatter + later concatenation). Nothing silently lost — every removal/merge/dedup logged. No invented religious/sacred/sexual doctrine. Tagging is fresh/anti-reuse; convergence is emergent + generative; tagging fully complete before convergence.
