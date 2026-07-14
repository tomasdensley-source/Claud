# The Book of the One House — Revised Fifth Edition

This directory contains the editable source reconstructed from the 201-page Fifth Literary Edition and revised against the 155-point editorial brief.

## Source layout

- `chapters/` — prologue, 43 numbered chapters, and coda
- `fragments/` — five standalone covenant, Chronicle, Yellow Book, and Gnosis fragments
- `assets/artwork/` — the 43 original Fifth Edition illustrations
- `header.tex` — print typography and page-style rules
- `tools/build.py` — deterministic manuscript assembly and PDF build
- `REVISION_LOG.md` — implementation record for every requested edit

The source of truth is the chapter-level Markdown. `book/build/manuscript.md` is generated and intentionally not edited by hand.

## Build

Requirements: Python 3, Pandoc, XeLaTeX, TeX Gyre Pagella, and the standard LaTeX `microtype`, `caption`, `fancyhdr`, `emptypage`, and `titlesec` packages.

Run:

`python3 book/tools/build.py`

The finished file is written to `The_Book_of_the_One_House_FIFTH_EDITION_REVISED.pdf` in the repository root.

Validate the manuscript, PDF structure, typography, and all editorial invariants with:

`python3 book/tools/validate.py`
