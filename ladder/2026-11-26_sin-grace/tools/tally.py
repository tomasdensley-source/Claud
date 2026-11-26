import glob, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cxparse import parse
lines = ["# CX tally (computed by script from reply files and number maps; parser tools/cxparse.py)", "", "| Run | # | Object | Verdict |", "|---|---|---|---|"]
tot = {"STANDS": 0, "BROKEN": 0}; bad = 0
for f in sorted(glob.glob("CX/CX-*_statements.tsv")):
    run = os.path.basename(f)[:6]
    ids = [l.split("\t")[0] for l in open(f, encoding="utf-8") if l.strip()]
    v = parse(open(f"CX/{run}_reply.txt", encoding="utf-8").read(), len(ids))
    for i, o in enumerate(ids, 1):
        w = v[i][0] or "INVALID (non-compliant reply)"
        if w in tot: tot[w] += 1
        else: bad += 1
        lines.append(f"| {run} | {i} | {o} | {w} |")
lines += ["", f"STANDS={tot['STANDS']} BROKEN={tot['BROKEN']} invalid={bad} tested={tot['STANDS']+tot['BROKEN']+bad}"]
open("CX_tally.md", "w").write("\n".join(lines) + "\n")
