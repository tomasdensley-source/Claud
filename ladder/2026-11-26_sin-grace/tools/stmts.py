"""Build a CX statements file from a markdown table: python3 -I tools/stmts.py OUT FILE IDREGEX SENTCOL [PREFIX]"""
import re, sys
out, path, pat, scol = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]); pref = sys.argv[5] if len(sys.argv) > 5 else ""
rows = []
for l in open(path, encoding="utf-8"):
    if not l.startswith("|"): continue
    c = [x.strip() for x in l.strip().strip("|").split("|")]
    if not c or not re.match(pat + r"$", c[0]) or len(c) <= scol: continue
    if len(c) > 2 and c[2] == "DISCARD": continue
    rows.append((pref + c[0], c[scol]))
assert rows, "no rows matched"
assert all(t and not t.startswith("(") for _, t in rows), "empty or placeholder sentence"
open(out, "w", encoding="utf-8").write("".join(f"{i}\t{t}\n" for i, t in rows))
print(out, [i for i, _ in rows])
