# Comparison: the compiled Writings against the rest of this repository

This report compares `The_Writings_of_Thomas_Densley.md` (214 works, 1,115,981 words, compiled 11 October 2026) with the three text sources already in the repository:

| Source in repo | What it is | Units compared |
|---|---|--:|
| `VERITAS_QUO_DISTILLED_PHILOSOPHY_v7.md` | 35 MB machine distillation of the vault ("v7") | 4,151 sections (one per `<!-- src: -->` marker) |
| `VaridisQuo_Markdown_Export_2026-05-23.zip` | May 2026 Obsidian vault export ("export") | 5,610 Markdown files |
| `book/` | Source of *The Book of the One House*, Revised Fifth Edition | 52 chapter and fragment files |

The split `Unified_Vault_2026-05-23.zip.part*` files described in the root README are not in the working tree, so they were not compared.

## Method

Every text was lowercased and reduced to words. Each run of 8 consecutive words was hashed, and the same fixed quarter of all hashes was kept for every text. A work's **coverage** in a source is the share of its kept 8-word runs that also occur somewhere in that source. A score of 100% means every sampled passage appears verbatim. A score of 0% means no 8-word run is shared. Different editions of the same work fall in between. The scripts are `tools/compare.py` and `tools/parse.py`, and the per-work numbers are in `tools/compare.json` and in the v7 and export columns of `CATALOG.md`.

Works under about 10 words have too few runs to score and show "—".

## 1. The compilation is itself about 30% repetition

25 works are at least 85% contained in a longer work in the same file. They add up to 325,521 words. The largest cases are:

- **On Plant Teachers** appears four ways: the 170,746-word full compendium (w126), a 47,272-word nine-substance compendium (w127), a 46,466-word typeset copy (w128), and six single-substance chapters (w124, w125, w129, w130, w131). All of the smaller ones are 88–98% inside w126.
- **Universal Codex**: *Ontology of the Void IDEAS ONLY* (w187, 89,838 words) is 87% inside the *MASTER (2)* note (w188, 141,259 words). The canticle and framework notes are also inside these.
- ***The Weight of What Is True***: Version 2 (w210) contains all of Version 1 (w209).
- ***Codex of the Burdened***: three editions (w050, w051, w052) share 94–98% of their text.
- ***Michael* review**: three versions (w086, w087, w088). Extended 2 contains all of the original.
- **Monolith adjudications**: w199, w200 and *Essential Voice* (w211) are 95–100% inside the Canonical Combined Source Anthology (w189).
- ***Vacancy*** Episode 1 (w085) and *The Candle and the Void* (w146) are inside *Parables and Stories* (w213).

Without these, the file holds **189 distinct works and about 790,000 words**. The PDF reading edition and the grey entries in the reader are based on this.

## 2. What the compilation adds to the repo

Of those 189 distinct works, **83 works (about 158,000 words) share less than 20% of their text with both v7 and the export**. In other words, they are new to this repository. These are the substantial ones (300 words or more):

| No. | Work | Words | v7 | export |
|---|---|--:|--:|--:|
| w209/w210 | *The Weight of What Is True* (Version 2 is the fuller) | 29,644 | 0% | 0% |
| w201 | Veritas Quo Monolith, Part 01 of 12 | 28,344 | 4% | 1% |
| w049 | *The Standing Book* | 14,407 | 0% | 0% |
| w208 | Super Research Operating Blueprint | 13,963 | 0% | 0% |
| w161 | Archive Pick (Markor Notes) | 13,250 | 1% | 1% |
| w190 | Convergence Audit and Rebuilt 120 | 13,182 | 2% | 14% |
| w048 | *The Book of Later*, Book One | 12,488 | 4% | 1% |
| w168 | Naming, Grace, and Sacrifice (conversation transcript) | 9,690 | 12% | 0% |
| w132 | What Myth This Corpus Suggests You Are Living | 5,215 | 0% | 1% |
| w195 | Grouped Inventory (Varidis Quo) | 3,989 | 0% | 0% |
| w155 | *Of the Name Given and the Glory Returned* (poem, partial) | 3,299 | 0% | 0% |
| w206 | Project Vision and 20-Step Roadmap | 2,354 | 0% | 0% |
| w144 | AE PDF 02 Universal Codex Legacy High Value | 2,076 | 11% | 13% |
| w203 | Monolith Segment 02 of 03, Part 09 of 17 | 1,255 | 5% | 14% |
| w207 | Remediation Plan (Markor) | 1,241 | 0% | 0% |
| w156 | *Of the Son and the Bow* (poem) | 606 | 0% | 1% |
| w084 | Without the Odyssey, There Is No Ulysses | 403 | 0% | 0% |

The literary core of that list is *The Weight of What Is True*, *The Standing Book*, *The Book of Later*, the two poems, *Of the Name Given* and *What Myth This Corpus Suggests*. None of them existed in the repo before. Most of the other new material is vault planning and audit documents.

Coverage of the rest: about 177,000 words of the distinct works are at least 80% in v7. Another 284,000 are 20–80% in v7, usually a different edition of the same piece. The export overlaps far less, with only about 18,000 words at least 80% covered, because it predates most of the 2026 work.

## 3. In the repo but not in the compilation

### Pieces the compilation's header lists as missing

| Header says missing | Status in this repo |
|---|---|
| *Calyx Motor Court*, Episodes 1–3 | **Partly here.** `The_Calyx_Motor_Court_Pilot.md` (6,317 words) is in v7, along with *Calyx – The Unfinished Seat* chapter synopses (13,085 words) and a 100-chapter plan analysis (10,539 words). Episodes 2–3 were not found. |
| *The Algebra of the Soul* | **Here.** v7 has three versions (6,877, 12,111 and 5,150 words), and the export has `05_AI_Tools_and_Guides/Prompting/The Algebra of the Soul.md` (6,457 words). |
| *On Belladonna* (Plants of Power, Part 1, Ch. 2) | **Already in the compilation.** The export copy (5,240 words) is 91% inside *On Plant Teachers* (w126). |
| *The Hollow Corridors* | **Not here.** The export holds only four 43-word attachment stubs pointing at PDFs. |
| *On LSA* (ololiuqui, ergot, Eleusis) | **Already in the compilation** as Chapter 3, "LSA — The Eleusinian Descent", of *On Plant Teachers* (w126–w128). |
| *Train of Thought*, narrative draft | Not found. |
| *Of the Name Given and the Glory Returned* (full) | Not found. The compilation's partial copy is the only one. |
| *Through the Fog* (full) | **Fuller copy here.** v7 has `Through the Fog_ Clarity, Non-Striving, and Integrity.md` at 3,714 words, against 898 words in the compilation. |
| *Essential Voice for Mom*, essay v8 | Not found beyond what the compilation already has. |
| *Author and Analysts* dialogue | Not found. |

### Other works of Thomas's in the repo that the compilation leaves out

These look like authored or co-authored literary or philosophical work. Each shares less than 20% of its text with the compilation.

| Work | Where | Words |
|---|---|--:|
| *The Book of the One House*, Revised Fifth Edition (45 chapters, 4 fragments) | `book/chapters`, `book/fragments` | 35,966 |
| *The Lighthouse That Waited* (six editions: Expansion, Definitive, Revised, Upgraded-3 and -5, Deep Rewrite) | v7 `Documents/Markdown/` | up to 34,653 |
| *Universal CODEX (Version 2)* | v7 `Documents/Markdown/` | 19,338 |
| *LKV Book Edition*, Standard Draft v5, and the LKV prototypes | v7 `Documents/` | 16,863 |
| *Backrooms Liminal Codex v3* | v7 `Documents/Markdown/` | 12,357 |
| *The Courtesy Key*: 12-episode audio adaptation | v7 and export `15_Writing_Literature/Courtesy_Required_Book_Series/` | 11,750 |
| *The Ledger Speaks*: clean narrative book | v7 `Documents/PDF/` | 10,399 |
| *Parables* Vol. 3 (Iteration 2) and Vol. 6 (Iterations 1–2) | export `15_Writing_Literature/Parables/` | 7,004 / 4,335 / 5,011 |
| Bastion lore notes (structural/spiritual; with the King in Yellow) | v7 `Liber Novus Densley/15_Writing_Literature/Bastion/` | 4,480 / 2,727 |
| *Story from the codex* | export `40_Universal_Codex/_General/` | 3,554 |
| *Canticle of the Flawed Equilibrium* (several layouts) | v7 and export | 712–2,528 |
| Wilderness session notes (*Exhausted Servant*, *Other Mother at the Door*) | v7 `Liber Novus Densley/regions/` | 1,359 / 2,091 |

The only overlap between the compilation and *The Book of the One House* is *Carcosa, My Friend* (w075). 95% of that letter is in the book as a fragment.

Personal material in the export that the compilation leaves out: the *Thomas Character Model* Q&A log (11,551 words) and master prompts, and two dated journal entries in `07_Thomas_Persona/Journal_Dated/` (2,302 and 2,898 words). These may have been left out deliberately.

### Material in the repo that is not Thomas's writing

Most of the rest of v7 and the export that the compilation omits is reference or third-party material. That includes public-domain books (Tolstoy, Gorky, Dante, *War and Peace*), Jung, Peterson and Kierkegaard references, quote compendia, movie lists, business and finance documents, AI prompt batches (for example, about 650,000 words of Backrooms image prompts), and machine-split "chunk" files. Leaving these out of a collection of Thomas's writings is correct.

## 4. Suggested next steps

1. Use *The Weight of What Is True*, Version 2, and *Codex of the Burdened* (w050) as the canonical statements of the philosophy, and archive the older editions.
2. Bring in the fuller *Through the Fog*, the Calyx Motor Court pilot, *The Algebra of the Soul*, *The Lighthouse That Waited* (pick one edition), *The Courtesy Key* audio adaptation and *The Ledger Speaks* if the goal is a complete literary collection.
3. Drop the vault working files (w195, w201–w203, w206–w208) from any future literary edition. They are about the archive, not part of it.
