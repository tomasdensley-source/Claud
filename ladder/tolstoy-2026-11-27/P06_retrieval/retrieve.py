"""Mechanical retrieval for the gate (P6). No model judgment.
Splits corpus C1 into paragraphs (blank-line separated), keeps paragraphs that
(1) match the claim's term pattern, (2) are not quotation-collection lines
(no attribution dash pattern '— Name' / '- Name' / '—Name'), (3) are 200-2500 chars.
Dedupes by exact text. Writes the hits with line numbers."""
import re, sys, json
C = sys.argv[1]; out = sys.argv[2]
pats = {
 "S-001": [r"\bhapp(y|iness)\b", r"\b(famil(y|ies)|household|home)\b", r"\b(alike|same|uniform|similar|resembl)"],
 "S-002": [r"\b(unhapp|misery|miserable|suffer)", r"\b(famil(y|ies)|household|home)\b", r"\b(own way|particular|unique|each|differ)"],
}
attrib = re.compile(r"(—|–|-)\s*[A-Z][a-z]+(\s[A-Z][a-z.]+)*\s*(\(|$|…)", re.M)
paras, buf, start = [], [], 1
for i, line in enumerate(open(C, encoding="utf-8", errors="replace"), 1):
    if line.strip() == "":
        if buf: paras.append((start, " ".join(x.strip() for x in buf)))
        buf = []; start = i + 1
    else: buf.append(line)
if buf: paras.append((start, " ".join(buf)))
res = {}
for cid, ps in pats.items():
    seen, hits = set(), []
    for ln, t in paras:
        if not (200 <= len(t) <= 2500): continue
        if attrib.search(t): continue
        if all(re.search(p, t, re.I) for p in ps):
            if t in seen: continue
            seen.add(t); hits.append({"line": ln, "text": t})
    res[cid] = hits
json.dump(res, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for k, v in res.items(): print(k, len(v))
