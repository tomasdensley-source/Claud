#!/usr/bin/env python3
"""Build the catalog and the HTML reader for The Writings of Thomas Densley.

Usage: python3 writings/tools/build.py
Needs only the Python standard library. compare.json is optional; when it is
present (from compare.py) the catalog and reader show repository coverage.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import zlib
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SRC = ROOT / "The_Writings_of_Thomas_Densley.md"
NOTES = json.loads((HERE / "notes.json").read_text(encoding="utf-8"))
COMPARE = HERE / "compare.json"

# Form for works without a hand-written note, by section.
SECTION_FORM = {
    "Aphorisms": "Aphorism", "Axiom Notes (X-series)": "Note", "Implication": "Note",
    "Reverse Implication": "Note", "Veritas Quo": "Note", "Definition": "Definition",
    "Poetry": "Poetry", "Essays": "Essay", "Essay": "Essay", "Self-Improvement": "Essay",
    "The Courtesy Ledger": "Notes", "Ontology of the Void": "Vault", "Other": "Fiction",
    "Convergence of Minds": "Note", "Note Clipped": "Notes",
}


def form_for(w):
    if w["id"] in NOTES:
        return NOTES[w["id"]][0]
    if w["section"].startswith("Def "):
        return "Definition"
    if "MOC Stub" in w["title"] or "Veritas Quo  " in w["title"]:
        return "Vault"
    return SECTION_FORM.get(w["section"], "Note")


def strip_frontmatter(body: str) -> str:
    return re.sub(r"\A\s*---\n.*?\n---\n", "", body, count=1, flags=re.S)


def first_sentence(body: str, title: str = "") -> str:
    text = strip_frontmatter(body)
    lines = []
    for ln in text.split("\n"):
        s = ln.strip()
        if not s or s == "---" or re.match(r"^[a-z_]+:\s", s) or s.startswith(("#", "![", "<", "> **", "[[", "- [[", "Links:", "Same work", "- `")):
            continue
        lines.append(s)
    t = " ".join(lines)
    t = re.sub(r"[*_`]", "", t).lstrip("> ")
    if not t:
        # Axiom notes keep their sentence in the heading; some notes have nothing else.
        heads = [ln.lstrip("# ").strip() for ln in text.split("\n") if ln.startswith("#")]
        t = re.sub(r"^[A-Z]{1,2}\d+[\w.]* - ", "", heads[0]) if heads else ""
        if not t or t.lower() == title.lower():
            return "Heading only. The source note has no text beyond its title and metadata."
        return t
    m = re.match(r"(.{20,220}?[.!?])(\s|$)", t)
    return (m.group(1) if m else t[:200]).strip()


WORD = re.compile(r"[a-z0-9']+")


def shingles(text):
    w = WORD.findall(text.lower().replace("’", "'"))
    out = set()
    for i in range(len(w) - 7):
        h = zlib.crc32(" ".join(w[i:i + 8]).encode())
        if h % 4 == 0:
            out.add(h)
    return out


def main():
    works = json.loads(subprocess.run(
        [sys.executable, "-I", str(HERE / "parse.py"), str(SRC), "/dev/stdout"],
        check=True, capture_output=True).stdout)
    cover = {}
    if COMPARE.exists():
        cover = {r["id"]: r for r in json.loads(COMPARE.read_text())["works"]}

    # Works mostly contained in a larger work of this file.
    sh = [shingles(w["body"]) for w in works]
    for i, w in enumerate(works):
        best = None
        for j, o in enumerate(works):
            if i == j or len(sh[i]) < 20 or len(sh[j]) < len(sh[i]):
                continue
            c = len(sh[i] & sh[j]) / len(sh[i])
            if c >= 0.85 and (best is None or c > best[1]):
                best = (o["id"], c)
        w["contained_in"] = best[0] if best else None
        w["form"] = form_for(w)
        w["summary"] = NOTES[w["id"]][1] if w["id"] in NOTES else first_sentence(w["body"], w["title"])
        c = cover.get(w["id"], {})
        w["in_distilled"] = c.get("distilled_v7")
        w["in_export"] = c.get("export_zip")
        w["in_book"] = c.get("one_house_book")

    write_catalog(works)
    write_reader(works)


def pct(x):
    return "—" if x is None else f"{round(x * 100)}%"


def write_catalog(works):
    by_id = {w["id"]: w for w in works}
    total = sum(w["words"] for w in works)
    forms = Counter()
    for w in works:
        forms[w["form"]] += w["words"]
    out = ["# Catalog of The Writings of Thomas Densley", "",
           f"Every work in `The_Writings_of_Thomas_Densley.md`, in file order: {len(works)} works, "
           f"{total:,} words. Built by `tools/build.py`.", "",
           "**No.** is an accession number for this catalog and the reader. **Form** is a reading aid, "
           "not a claim about authorship. **Contained in** names a larger work in this file that already "
           "holds at least 85% of this one's text. The coverage columns show how much of the work's text "
           "also appears in `VERITAS_QUO_DISTILLED_PHILOSOPHY_v7.md` (v7) and in "
           "`VaridisQuo_Markdown_Export_2026-05-23.zip` (export). See `COMPARISON_REPORT.md`.", "",
           "## Words by form", "", "| Form | Works | Words |", "|---|--:|--:|"]
    fc = Counter(w["form"] for w in works)
    for f, n in forms.most_common():
        out.append(f"| {f} | {fc[f]} | {n:,} |")
    out += ["", "## Works", ""]
    sec = None
    for w in works:
        if w["section"] != sec:
            sec = w["section"]
            out += ["", f"### {sec}", "", "| No. | Title | Words | Form | Summary | Contained in | v7 | export |",
                    "|---|---|--:|---|---|---|--:|--:|"]
        cin = ""
        if w["contained_in"]:
            o = by_id[w["contained_in"]]
            cin = f"{o['id']} {o['title'][:40]}"
        summ = w["summary"].replace("|", "\\|")
        title = w["title"].replace("|", "\\|")
        out.append(f"| {w['id']} | {title} | {w['words']:,} | {w['form']} | {summ} | {cin} | "
                   f"{pct(w['in_distilled'])} | {pct(w['in_export'])} |")
    (ROOT / "CATALOG.md").write_text("\n".join(out) + "\n", encoding="utf-8")


def write_reader(works):
    page = (HERE / "reader_template.html").read_text(encoding="utf-8")
    data = [{k: w[k] for k in ("id", "section", "title", "source", "words", "form", "summary",
                               "contained_in", "in_distilled", "in_export", "in_book")}
            | {"body": strip_frontmatter(w["body"])} for w in works]
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    page = page.replace("__DATA__", blob)
    (ROOT / "reader").mkdir(exist_ok=True)
    (ROOT / "build").mkdir(exist_ok=True)
    (ROOT / "build" / "artifact.html").write_text(page, encoding="utf-8")  # page body only, for publishing
    standalone = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'
                  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
                  '</head><body>\n' + page + "\n</body></html>\n")
    (ROOT / "reader" / "index.html").write_text(standalone, encoding="utf-8")

    # Print edition: no works contained in a longer one, no vault working files.
    keep = [d for d in data if not d["contained_in"] and d["form"] != "Vault"]
    pblob = json.dumps(keep, ensure_ascii=False).replace("</", "<\\/")
    (ROOT / "build").mkdir(exist_ok=True)
    (ROOT / "build" / "print.html").write_text(
        (HERE / "print_template.html").read_text(encoding="utf-8").replace("__DATA__", pblob), encoding="utf-8")


if __name__ == "__main__":
    main()
