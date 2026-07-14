#!/usr/bin/env python3
"""Assemble the revised Markdown sources and build the print PDF."""

from __future__ import annotations

import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BOOK = ROOT / "book"
CHAPTERS = BOOK / "chapters"
FRAGMENTS = BOOK / "fragments"
ARTWORK = BOOK / "assets" / "artwork"
BUILD = BOOK / "build"
OUTPUT = ROOT / "The_Book_of_the_One_House_FIFTH_EDITION_REVISED.pdf"

PARTS = [
    (
        "Part I",
        "The Field Beyond Verrin",
        [f"{n:02d}-" for n in range(1, 9)],
        ["fragment-remembrance.md"],
    ),
    (
        "Part II",
        "The House That Remembered",
        [f"{n:02d}-" for n in range(9, 19)],
        ["fragment-two-medicines.md"],
    ),
    (
        "Part III",
        "The Unreliable Wall",
        [f"{n:02d}-" for n in range(19, 27)],
        ["fragment-yellow-book.md"],
    ),
    (
        "Part IV",
        "The Chronicle Beneath the House",
        [f"{n:02d}-" for n in range(27, 35)],
        ["fragment-chronicle.md"],
    ),
    (
        "Part V",
        "The Sacrificial Gnosis",
        [f"{n:02d}-" for n in range(35, 44)],
        ["fragment-gnosis.md"],
    ),
]

# Artwork is retained from the Fifth Literary Edition. These are decorative
# chapter plates, not evidentiary figures; each receives one clean caption.
PLATES = {
    "00-prologue.md": ("img-001.jpg", "The first light within the unpainted center."),
    "01-the-throne-without-a-face.md": ("img-002.jpg", "The ruined throne beyond Verrin."),
    "02-a-city-made-gentle.md": ("img-003.jpg", "Verrin in the season of pears."),
    "03-the-calling-of-names.md": ("img-004.jpg", "Names carried into active memory."),
    "04-the-four-rooms.md": ("img-005.jpg", "The protest in the fifth room."),
    "05-the-carpenters-wheel.md": ("img-006.jpg", "Hadrin’s wheel without a final center."),
    "06-the-one-more-turn.md": ("img-007.jpg", "The road’s uncounted turn."),
    "08-the-miracle-of-the-lost-child.md": ("img-008.jpg", "The keepers carry Pela’s name."),
    "09-the-keeper-of-jars.md": ("img-009.jpg", "Senn among the jars and records."),
    "10-the-two-springs.md": ("img-010.jpg", "Two springs, one hidden source."),
    "12-the-first-blank-room.md": ("img-011.jpg", "The first blank room opens."),
    "13-the-five-keepers.md": ("img-012.jpg", "Four keepers around the fifth chair."),
    "14-foam-for-sale.md": ("img-013.jpg", "Foam at the surface of the work."),
    "15-the-weightless-feast.md": ("img-014.jpg", "A feast that owes no lesson."),
    "17-the-protest-that-walked.md": ("img-016.jpg", "The protest walks out of the House."),
    "18-the-play-in-yellow.md": ("img-015.jpg", "The actor beneath the yellow robe."),
    "19-the-density-oracle.md": ("img-017.jpg", "The Oracle gathers its echoes."),
    "20-the-reviser.md": ("img-018.jpg", "The Reviser enters the Cold Hall."),
    "21-the-mirror-court.md": ("img-019.jpg", "The court reflects a single source."),
    "22-the-demolition-field.md": ("img-020.jpg", "The buried court of the First One."),
    "23-the-door-behind-the-door.md": ("img-021.jpg", "A door opens behind the door."),
    "24-the-corridor-of-delays.md": ("img-022.jpg", "The lower corridor offers delay."),
    "25-carcosa.md": ("img-024.jpg", "Carcosa beneath the black stars."),
    "26-the-collector-of-unpaid-evenings.md": ("img-023.jpg", "The Collector opens the unpaid evening."),
    "27-the-first-ones.md": ("img-026.jpg", "The first builders beneath the world."),
    "28-the-three-choices-of-years.md": ("img-027.jpg", "Three choices in the counting of years."),
    "29-the-narrow-bridge.md": ("img-028.jpg", "The narrow bridge refuses a child."),
    "30-the-calix.md": ("img-029.jpg", "The circular architecture of Calix."),
    "31-the-toxic-knower.md": ("img-032.jpg", "Correction touches the toxic knower."),
    "32-the-cord-cutter.md": ("img-039.jpg", "The blade becomes a gate."),
    "33-theology-at-the-shore.md": ("img-031.jpg", "At the shore of honest theology."),
    "34-the-opened-hub.md": ("img-033.jpg", "The Open Hub beyond proof."),
    "35-the-return-through-the-repeating-doors.md": ("img-025.jpg", "The repeating doors of the return."),
    "36-the-bastion-that-decides.md": ("img-034.jpg", "The Bastion before the open gate."),
    "37-the-waterworks.md": ("img-035.jpg", "Old stone joins new craft."),
    "38-the-house-under-its-own-audit.md": ("img-036.jpg", "The House stands under its own audit."),
    "39-the-names-that-began-to-fade.md": ("img-037.jpg", "The city remembers through the seventh night."),
    "40-the-descendants-door.md": ("img-040.jpg", "One hand may refuse; one may receive."),
    "41-the-repair.md": ("img-038.jpg", "Light descends through the repaired court."),
    "43-the-field-long-after.md": ("img-041.jpg", "The field, long after."),
    "fragment-gnosis.md": ("img-030.jpg", "Knowledge demands descent rather than a crown."),
    "coda-the-twelve-stones.md": ("img-042.jpg", "An answer on one face; an opening on the other."),
}


def chapter_file(prefix: str) -> Path:
    matches = list(CHAPTERS.glob(prefix + "*.md"))
    if len(matches) != 1:
        raise RuntimeError(f"Expected one chapter for {prefix!r}, found {matches}")
    return matches[0]


def plate_block(filename: str) -> str:
    plate = PLATES.get(filename)
    if not plate:
        return ""
    image, caption = plate
    image_path = (ARTWORK / image).relative_to(ROOT).as_posix()
    return (
        "\n"
        "\\begin{center}\n"
        "\\centering\n"
        f"\\includegraphics[height=2.1in,keepaspectratio]{{{image_path}}}\n"
        "\\par\\smallskip\n"
        f"{{\\small\\itshape {caption}\\par}}\n"
        "\\end{center}\n"
    )


def render_source(path: Path, numbered: bool) -> str:
    text = path.read_text(encoding="utf-8").strip()
    lines = text.splitlines()
    heading = lines[0]
    if numbered:
        match = re.fullmatch(r"# Chapter \d+ — (.+)", heading)
        if not match:
            raise RuntimeError(f"Malformed chapter heading in {path}: {heading}")
        lines[0] = f"# {match.group(1)}"
    else:
        lines[0] = heading + " {.unnumbered}"

    insert_at = 1
    if len(lines) > 2 and lines[1] == "":
        if lines[2].startswith("*") and lines[2].endswith("*"):
            insert_at = 3
        elif lines[2].startswith(">"):
            insert_at = 2
            while insert_at < len(lines) and lines[insert_at].startswith(">"):
                insert_at += 1
        while insert_at < len(lines) and lines[insert_at] == "":
            insert_at += 1
    plate = plate_block(path.name)
    if plate:
        lines.insert(insert_at, plate)
    return "\n".join(lines).strip() + "\n"


def running_mark(path: Path) -> str:
    heading = path.read_text(encoding="utf-8").splitlines()[0].removeprefix("# ")
    return f"\\markboth{{{heading}}}{{{heading}}}\n"


def assemble() -> Path:
    BUILD.mkdir(parents=True, exist_ok=True)
    cover = (ARTWORK / "img-000.jpg").relative_to(ROOT).as_posix()
    sections = [
        "---\n"
        "lang: en-US\n"
        "title-meta: The Book of the One House\n"
        "author-meta: Thomas Densley\n"
        "---\n",
        "\\begin{titlepage}\n"
        "\\newgeometry{margin=0pt}\n"
        "\\thispagestyle{empty}\n"
        f"\\noindent\\includegraphics[width=\\paperwidth,height=\\paperheight]{{{cover}}}\n"
        "\\restoregeometry\n"
        "\\end{titlepage}\n"
        "\\begin{titlepage}\n"
        "\\centering\n"
        "\\vspace*{0.16\\textheight}\n"
        "{\\Huge\\scshape The Book of the One House\\par}\n"
        "\\vspace{1.2em}\n"
        "{\\Large A Chronicle of Verrin and the Calix\\par}\n"
        "\\vfill\n"
        "{\\Large Thomas Densley\\par}\n"
        "\\vspace{1em}\n"
        "{\\small Fifth Literary Edition — Revised\\par}\n"
        "\\vfill\n"
        "\\textit{The throne remains empty. The covenant remains operative.\\\\\n"
        "What has no witness returns to the unmade.}\n"
        "\\end{titlepage}\n"
        "\\frontmatter\n"
        "\\tableofcontents\n"
        "\\cleardoublepage\n",
        running_mark(CHAPTERS / "00-prologue.md"),
        render_source(CHAPTERS / "00-prologue.md", numbered=False),
        "\\mainmatter\n",
    ]

    for part_number, part_title, chapter_prefixes, fragment_names in PARTS:
        sections.append(f"\\part{{{part_title}}}\n")
        for prefix in chapter_prefixes:
            sections.append(render_source(chapter_file(prefix), numbered=True))
        for fragment in fragment_names:
            fragment_path = FRAGMENTS / fragment
            sections.append(running_mark(fragment_path))
            sections.append(render_source(fragment_path, numbered=False))

    coda = CHAPTERS / "coda-the-twelve-stones.md"
    sections.extend(
        [
            "\\backmatter\n",
            running_mark(coda),
            render_source(coda, numbered=False),
        ]
    )
    manuscript = BUILD / "manuscript.md"
    manuscript.write_text("\n\n".join(sections), encoding="utf-8")
    return manuscript


def build_pdf() -> None:
    manuscript = assemble()
    command = [
        "pandoc",
        str(manuscript),
        "--from=markdown+smart",
        "--pdf-engine=xelatex",
        "--number-sections",
        "--top-level-division=chapter",
        "--include-in-header",
        str(BOOK / "header.tex"),
        "--resource-path",
        str(ROOT),
        "-V",
        "documentclass=book",
        "-V",
        "classoption=openany",
        "-V",
        "papersize=custom",
        "-V",
        "geometry:paperwidth=6in,paperheight=9in,inner=0.78in,outer=0.65in,top=0.72in,bottom=0.72in",
        "-V",
        "mainfont=TeX Gyre Pagella",
        "-V",
        "fontsize=10.5pt",
        "-V",
        "linestretch=1.08",
        "-V",
        "indent=true",
        "-o",
        str(OUTPUT),
    ]
    subprocess.run(command, cwd=ROOT, check=True)
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()
