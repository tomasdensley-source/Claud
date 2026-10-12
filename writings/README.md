# The Writings of Thomas Densley

`The_Writings_of_Thomas_Densley.md` is a single-file compilation of 214 works (1,115,981 words), made on 11 October 2026 from the Google Drive folder "Writings". It is kept here unchanged. Everything else in this folder is built from it.

| File | What it is |
|---|---|
| `The_Writings_of_Thomas_Densley.md` | The source compilation, unchanged |
| `CATALOG.md` | Every work, numbered w001–w214, with section, words, form, a one-line summary, internal duplicates, and how much of each work is already in the repo |
| `ANALYSIS.md` | Themes, a glossary of coined terms, a note on authorship, a ranked reading list, and editing notes |
| `COMPARISON_REPORT.md` | What the compilation adds to this repo, what the repo has that the compilation lacks, and the status of the pieces the compilation's header lists as missing |
| `reader/index.html` | A self-contained reader: contents by section, full-text search, filters by form, dark mode. Open it in a browser (it loads two small libraries from cdnjs) |
| `The_Writings_of_Thomas_Densley_Reading_Edition.pdf` | A 6×9 in. print edition, 1,545 pages: 177 works and 738,012 words, without internal duplicates or vault working files, with a PDF outline |

## Rebuilding

```
python3 writings/tools/build.py                 # CATALOG.md, reader/, build/print.html
node writings/tools/make_pdf.js                 # PDF (needs Playwright + Chromium; set CHROMIUM=/path/to/chrome if needed)
```

`tools/compare.py` regenerates `tools/compare.json` (repo coverage). It needs the export zip unpacked:

```
unzip -q VaridisQuo_Markdown_Export_2026-05-23.zip -d /tmp/export
python3 writings/tools/parse.py writings/The_Writings_of_Thomas_Densley.md /tmp/works.json
python3 writings/tools/compare.py /tmp/works.json VERITAS_QUO_DISTILLED_PHILOSOPHY_v7.md "/tmp/export/✦ My Vault ✦" book writings/tools/compare.json
```

`tools/notes.json` holds the hand-written form and summary for the 71 longer works. Shorter works get their first sentence.
