#!/usr/bin/env python3
"""Validate the revised manuscript and generated print PDF."""

from __future__ import annotations

import re
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BOOK = ROOT / "book"
PDF = ROOT / "The_Book_of_the_One_House_FIFTH_EDITION_REVISED.pdf"


def run(*args: str) -> str:
    return subprocess.run(args, cwd=ROOT, check=True, text=True, capture_output=True).stdout


def require(condition: bool, label: str) -> None:
    if not condition:
        raise AssertionError(label)
    print(f"PASS {label}")


def validate_sources() -> None:
    chapters = sorted((BOOK / "chapters").glob("*.md"))
    fragments = sorted((BOOK / "fragments").glob("*.md"))
    files = chapters + fragments
    text = "\n".join(path.read_text(encoding="utf-8") for path in files)

    numbered = list((BOOK / "chapters").glob("[0-9][0-9]-*.md"))
    require(len(numbered) - 1 == 43, "43 numbered chapters")
    require(len(fragments) == 5, "five standalone fragments")
    require(
        all(path.read_text().count("“") == path.read_text().count("”") for path in files),
        "balanced smart quotation marks",
    )
    require(
        not re.search(r"^CHAPTER(?: 29)?$|^THE RETURN THROUGH THE$|^HALL$", text, re.M),
        "no fossil headings",
    )
    require("BACKROOMS" not in text.upper(), "no in-world Backrooms label")
    require(
        len(
            re.findall(
                r"^## Question (?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\.",
                text,
                re.M,
            )
        )
        == 12,
        "twelve coda questions",
    )
    require(
        len(
            re.findall(
                r"That (?:is|was) (?:the|its) (?:strangeness|corruption|difficulty)",
                text,
            )
        )
        == 2,
        "rhetorical capper budget",
    )
    require(len(re.findall(r"Years later", text, re.I)) == 1, "prolepsis budget")

    required_passages = [
        "four keepers and set a fifth chair",
        "“I forgive you,”",
        "You beyond the Wall",
        "A wall decides what may be seen",
        "did not accept the Vessel’s apology, only its repair",
        "What the system no longer classified, it no longer corrected",
        "for sixteen years",
    ]
    for passage in required_passages:
        require(passage in text, f"required passage: {passage}")
    require("measures of time The Chronicle" not in text, "no fused Chapter 28 caption")

    log = (BOOK / "REVISION_LOG.md").read_text(encoding="utf-8")
    covered: set[int] = set()
    for first, last in re.findall(r"\| (\d+)(?:–(\d+))? \|", log):
        start = int(first)
        end = int(last or first)
        covered.update(range(start, end + 1))
    require(covered == set(range(1, 156)), "revision log covers items 1–155")


def validate_pdf() -> None:
    require(PDF.exists(), "revised PDF exists")
    info = run("pdfinfo", str(PDF))
    require("Title:           The Book of the One House" in info, "PDF title metadata")
    require("Author:          Thomas Densley" in info, "PDF author metadata")
    require("Pages:           151" in info, "PDF page count")
    require("Page size:       432 x 648 pts" in info, "6×9-inch trim size")
    require("Encrypted:       no" in info, "PDF is not encrypted")

    image_lines = [
        line
        for line in run("pdfimages", "-list", str(PDF)).splitlines()
        if re.match(r"\s*\d+\s+\d+\s+image\s+", line)
    ]
    require(len(image_lines) == 43, "cover plus 42 embedded plates")

    font_lines = [
        line
        for line in run("pdffonts", str(PDF)).splitlines()
        if "TeXGyrePagella" in line
    ]
    require(len(font_lines) == 3 and all(" yes " in line for line in font_lines), "fonts embedded")

    with tempfile.NamedTemporaryFile(suffix=".txt") as extracted:
        subprocess.run(
            ["pdftotext", "-layout", str(PDF), extracted.name],
            cwd=ROOT,
            check=True,
        )
        pdf_text = Path(extracted.name).read_text(encoding="utf-8")

    require(not re.search(r"\bI Part I\b|\bII Part II\b", pdf_text), "normalized part labels")
    require("43.1 Question" not in pdf_text[:8000], "coda questions excluded from contents")
    require(
        bool(
            re.search(
                r"curse was the loss of a\s+language in which dangerous truth",
                pdf_text,
            )
        ),
        "Chapter 30–31 sentence repaired",
    )
    require(
        "answer had barely left Mara’s mouth when the first correction" in pdf_text,
        "Chapter 31 transition linked",
    )
    require("BACKROOMS" not in pdf_text.upper(), "Chapter 35 fossil removed")
    require(
        pdf_text.count("The faithful were not told merely to remember.") == 1,
        "Remembrance body appears once",
    )

    manuscript = BOOK / "build" / "manuscript.md"
    require(manuscript.exists(), "assembled manuscript exists")
    require("/workspace/" not in manuscript.read_text(), "assembled paths are portable")


def main() -> None:
    validate_sources()
    validate_pdf()
    print("All revised-edition validations passed.")


if __name__ == "__main__":
    main()
