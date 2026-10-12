#!/usr/bin/env python3
"""Split The_Writings_of_Thomas_Densley.md into its works.

A work starts at a '## Title' line followed by a '*Source file: `...`*' line.
A section starts at a '# Section' line whose next work heading follows it.
Writes works.json next to the source file.
"""
import json, re, sys
from pathlib import Path

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parents[1] / "The_Writings_of_Thomas_Densley.md")
lines = SRC.read_text(encoding="utf-8").split("\n")

# Section names from the Contents block (### Name between '## Contents' and the first '---').
start = lines.index("## Contents")
sections = []
for ln in lines[start + 1:]:
    if ln.strip() == "---":
        break
    if ln.startswith("### "):
        sections.append(ln[4:].strip())
section_set = set(sections)

work_starts = []  # (line index of '## Title', title, source)
for i, ln in enumerate(lines):
    m = re.match(r"\*Source file: `(.+)`\*$", ln.strip())
    if m:
        j = i - 1
        while j >= 0 and not lines[j].strip():
            j -= 1
        if lines[j].startswith("## "):
            work_starts.append((j, lines[j][3:].strip(), m.group(1), i))

body_start = next(i for i in range(start, len(lines)) if lines[i].strip() == "---") + 1
works = []
for n, (j, title, source, srcline) in enumerate(work_starts):
    end = work_starts[n + 1][0] if n + 1 < len(work_starts) else len(lines)
    # Find this work's section: nearest '# Section' line before j that is a known section.
    sec = None
    for k in range(j - 1, body_start - 1, -1):
        if lines[k].startswith("# ") and lines[k][2:].strip() in section_set:
            # only accept it if no other work starts between k and j
            if not works or works[-1]["line_start"] < k or works[-1]["section"] == lines[k][2:].strip():
                sec = lines[k][2:].strip()
                break
    if sec is None:
        sec = works[-1]["section"]
    # Trim a trailing section heading ('---', '', '# Next') from the body.
    e = end
    while e > srcline + 1 and (not lines[e - 1].strip() or lines[e - 1].strip() == "---"
                                or (lines[e - 1].startswith("# ") and lines[e - 1][2:].strip() in section_set)):
        e -= 1
    body = "\n".join(lines[srcline + 1:e])
    words = len(re.findall(r"\S+", body))
    works.append(dict(id=f"w{n+1:03d}", section=sec, title=title, source=source,
                      line_start=j + 1, line_end=e, words=words, body=body))

json.dump(works, open(sys.argv[2] if len(sys.argv) > 2 else "/dev/stdout", "w"), ensure_ascii=False)
print(len(works), "works;", sum(w["words"] for w in works), "words;", len({w['section'] for w in works}), "sections", file=sys.stderr)
