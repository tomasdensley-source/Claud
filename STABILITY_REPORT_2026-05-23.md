---
title: Stability Report — 2026-05-23 (mobile crash-prevention)
type: report
tags:
  - report
  - stability
updated: 2026-05-23
cssclasses:
  - vq-home
---

# 🛡 Stability Report — making the vault not crash (mobile / S24 Ultra)

A non-destructive reliability pass. **Hard invariants — both verified before/after:**
- Markdown words: **46,188,903 → 46,193,653** (never decreased — splitting added a few index words).
- Attachments: **1,073 images / 1,169 total — unchanged** (images were optimized in place, never removed).

Per-change log: `STABILITY_PASS_2026-05-23.tsv`. All edits are config/query/split/image-optimization — zero prose or attachments removed.

## A. Plugin load on mobile (top crash lever)
- **Restored 5 broken enables** (folders were missing `main.js`): `dataview`, `pdf-plus`, `obsidian-admonition`, `obsidian-meta-bind-plugin`, `obsidian-emoji-toolbar`. A broken **Dataview** had been silently disabling ~2,229 `dataview` + ~1,894 `dataviewjs` blocks — restoring it makes the indexes/MOCs actually render.
- **Marked 17 heavy plugins `isDesktopOnly`** so they no longer load on the phone (kept fully available on desktop): Excalidraw (8.2 MB), QuickAdd (4.1 MB), periodic-para (1.4 MB), Kanban, Linter, Importer, Text-format, Code-block, Advanced-canvas, Table-editor, CustomJS, Imgur, ElevenLabs, Emoji-toolbar, Meta-bind, PDF++, Better-search-views. → ~18 MB+ of plugin code removed from the mobile load.
- Result: **0 broken enables**; every enabled plugin has `manifest.json` + `main.js`.

## D. Image memory (the big mobile-OOM cut)
Obsidian's render memory scales with image **pixel dimensions**, not file size. Downscaled **806** oversized images to ≤1280 px (max), re-encoded in place (PNG/JPEG/WebP), **same filenames, same count**. Disk **709 MB → 509 MB**; decoded render memory cut far more. 267 already-small/animated images untouched. 0 errors.

## C. Oversized notes (mobile editor crash)
Split **19 notes >4 MB** (up to 44 MB) into ≤1.5 MB linked parts under a `<note>/` folder, leaving a small index that links them. **Every word preserved**; no markdown note now exceeds 4 MB. (e.g. `ttttt.md` 44 MB→30 parts, the film concatenations 38–43 MB, `Lead Template`, `Zettelkasten Hub`.)

## B. Query load
Replaced **70** expensive `contains(file.outlinks/inlinks)` backlink-scan dataview blocks (in the concept/MOC/source notes) with a pointer to Obsidian's native Backlinks panel (same result, no full-vault scan). Remaining `FROM ""` scans: 6 (the intentional vault-map aggregate + a couple of user notes). The ~1,894 user-authored `dataviewjs` blocks were left intact (content, not touched).

## E. Graph view
Global graph set to **hide attachments, orphans, and tags** — drops ~1,000+ image nodes and many orphans so the graph is far lighter if opened. (At ~15 k notes, prefer local/filtered graph on mobile.)

## F. Startup resilience
Homepage `openOnStartup` and `refreshDataview` → **false**, so a heavy first render can't block/crash launch.

## G. Config integrity
Re-validated **all `.obsidian/*.json`** correctly (an earlier audit's "484 invalid" was a path-quoting artifact): **0 invalid**. No corrupt workspace/appearance/graph config.

## What this does NOT touch (by your constraint)
No prose deleted, no attachments deleted. The ~1,894 `dataviewjs` blocks and the giant film datasets remain (now split). If crashes persist on mobile, the next safe levers are: trimming more plugins from mobile, converting heavy `dataviewjs` to plain `dataview`, and (with your OK) consolidating the largest dataview dashboards.
