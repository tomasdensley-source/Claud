#!/usr/bin/env python3
"""Compare the compiled writings against other text sources by shared word sequences.

Usage: compare.py works.json DISTILLED.md EXPORT_DIR BOOK_DIR OUT.json

Text is lowercased and reduced to words. Every 8-word sequence is hashed and a
fixed quarter of the hashes is kept (the same quarter everywhere), so coverage
is the share of a text's kept sequences that also occur in the other source.
"""
import json, re, sys, zlib
from pathlib import Path

N, KEEP = 8, 4
WORD = re.compile(r"[a-z0-9']+")

def shingles(text):
    w = WORD.findall(text.lower().replace("’", "'"))
    out = set()
    for i in range(len(w) - N + 1):
        h = zlib.crc32(" ".join(w[i:i + N]).encode())
        if h % KEEP == 0:
            out.add(h)
    return out, len(w)

def cov(a, b):
    return round(len(a & b) / len(a), 3) if a else None

works_path, distilled, export_dir, book_dir, out_path = sys.argv[1:6]
works = json.load(open(works_path))

# Distilled v7: units delimited by <!-- src: ... --> comments.
dtext = Path(distilled).read_text(encoding="utf-8", errors="replace")
parts = re.split(r"<!-- src: (.*?) -->", dtext)
dunits = [(parts[i], parts[i + 1]) for i in range(1, len(parts) - 1, 2)]

def load_dir(root, pattern="*.md"):
    for p in sorted(Path(root).rglob(pattern)):
        if p.is_file():
            yield str(p.relative_to(root)), p.read_text(encoding="utf-8", errors="replace")

sources = {
    "distilled_v7": [(s, *shingles(t)) for s, t in dunits],
    "export_zip": [(s, *shingles(t)) for s, t in load_dir(export_dir)],
    "one_house_book": [(s, *shingles(t)) for s, t in load_dir(book_dir)],
}
union = {k: set().union(*(u[1] for u in v)) for k, v in sources.items()}

W = []
all_w = set()
for w in works:
    sh, n = shingles(w["body"])
    all_w |= sh
    W.append(sh)

result = {"works": [], "gaps": {}}
for w, sh in zip(works, W):
    row = {k: w[k] for k in ("id", "section", "title", "words")}
    for k in sources:
        row[k] = cov(sh, union[k])
    result["works"].append(row)

# Reverse direction: units of each source with little overlap with the writings.
for k, units in sources.items():
    rows = []
    for name, sh, n in units:
        rows.append({"path": name, "words": n, "in_writings": cov(sh, all_w)})
    result["gaps"][k] = rows

json.dump(result, open(out_path, "w"), ensure_ascii=False, indent=0)
