import re, json, html, os, sys
R = sys.argv[1]; OUT = sys.argv[2]
def rd(p): return open(os.path.join(R, p), encoding="utf-8").read()
def table(p, pat):
    rows = []
    for l in rd(p).splitlines():
        if not l.startswith("|"): continue
        c = [x.strip() for x in l.strip().strip("|").split("|")]
        if re.match(pat, c[0]): rows.append(c)
    return rows

# ---------- verdicts ----------
cx = {}  # object -> (run, num, verdict)
for c in table("CX_tally.md", r"CX-\d{3}$"):
    cx[c[2]] = (c[0], int(c[1]), c[3])
def segments(text, pat):
    ms = list(re.finditer(pat, text, flags=re.M)); out = {}
    for i, m in enumerate(ms):
        k = int(m.group(1))
        if k in out: continue
        end = ms[i+1].start() if i+1 < len(ms) else len(text)
        out[k] = text[m.start():end].strip()
    return out
seg = {}
import glob
RUNS = sorted(os.path.basename(f)[:6] for f in glob.glob(os.path.join(R, "CX/CX-*_reply.txt")))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cxparse import parse as cxparse
for run in RUNS:
    nst = len([l for l in rd(f"CX/{run}_statements.tsv").splitlines() if l.strip()])
    seg[run] = {i: v[1] for i, v in cxparse(rd(f"CX/{run}_reply.txt"), nst).items()}
p4seg = segments(rd("P04_reply.txt"), r"^\W*(\d+)\.\s*\**\s*(?:DEMONSTRATED|CONTESTED|FALSE AS STATED)")
p4map = {l.split()[1]: int(l.split()[0]) for l in rd("P04_numbermap.txt").splitlines() if l.strip()}
p4cat = {}
for l in rd("P04_tally.txt").splitlines():
    m = re.match(r"(DEMONSTRATED|CONTESTED|FALSE AS STATED): \d+ (\[.*\])", l)
    if m:
        for i in eval(m.group(2)): p4cat[i] = m.group(1)

nodes = {}; edges = []
def node(key, label, kind, text, col, diagram, status="untested", **kw):
    d = dict(key=key, label=label, kind=kind, text=text, col=col, diagram=diagram, status=status)
    d.update(kw); nodes[key] = d; return d
def tested(obj):
    if obj in cx:
        run, num, v = cx[obj]
        return ("stands" if v == "STANDS" else "broken"), dict(run=run, num=num, verdict=v, reply=seg[run].get(num, ""))
    return "untested", None
def edge(a, b, kind="flow", label=""):
    edges.append(dict(a=a, b=b, kind=kind, label=label))

src = re.search(r"## The piece, verbatim.*?\n\n(.+?)\n", rd("P00_source.md"), flags=re.S).group(1)

# ---------- claims ----------
claims = re.findall(r"### (S-\d{3})\nText: (.+)\nAnchor: (.+)", rd("P01_claims.md"))
for d in ("L", "A"):
    node(f"{d}:PIECE", "P00 piece", "piece", src, 0, d, "source", prov="P00_source.md (verbatim)")
    for cid, t, anc in claims:
        node(f"{d}:{cid}", cid, "claim", t, 1, d, "extracted", prov=f"P01_claims.md; anchor {anc}")
        edge(f"{d}:PIECE", f"{d}:{cid}")

# ---------- DIAGRAM A: assumption lineage ----------
for c in table("P03_generalized.md", r"S-\d{3}\.[ab]$"):
    i, orig, gen = c[0], c[1], c[2]
    cat = p4cat[i]; st = {"DEMONSTRATED": "p4dem", "CONTESTED": "p4con", "FALSE AS STATED": "p4false"}[cat]
    node(f"A:{i}", i, "assumption", gen, 2, "A", st, prov="P03_generalized.md; audited in P4",
         test=dict(run="P4 audit", num=p4map[i], verdict=cat, reply=p4seg.get(p4map[i], "")), original=orig)
    edge(f"A:{i[:5]}", f"A:{i}")
for c in table("P04R_reformulated.md", r"S-\d{3}"):
    nid, pred, p4, op, sent, rec = c[:6]
    pid = c[0] if pred.startswith("(kept") else pred
    st, t = tested(nid)
    node(f"A:R1:{nid}", nid + (" (kept)" if pred.startswith("(kept") else ""), "reformulation", sent, 3, "A", st,
         op=op, receipt=rec, prov="P04R_reformulated.md; tested CX-001", test=t)
    edge(f"A:{pid}", f"A:R1:{nid}", "repair" if op not in ("none",) else "flow", op if op != "none" else "kept")
# rounds
def failed_obj(f):
    m = re.match(r"(CX-\d{3}) #(\d+)", f); run, num = m.group(1), int(m.group(2))
    for o, (r_, n_, v) in cx.items():
        if r_ == run and n_ == num: return o
roundcols = {"L4_repairs_round1.md": 4, "L4_repairs_round2.md": 5, "L4_repairs_round3.md": 6, "L4_repairs_round4.md": 6}
rev_inputs = []
for f, col in roundcols.items():
    for c in table(f, r"[SA]-\d{3}"):
        if len(c) < 6 or re.match(r"A-\d{3}(?:v2)?-S\d", c[0]): continue
        obj, failed, op, sent, rec, loss = c[:6]
        pred = failed_obj(failed)
        d = "L" if obj.startswith("A-") else "A"
        if d == "A":
            pkey = f"A:R1:{pred}" if f"A:R1:{pred}" in nodes else f"A:R2:{pred}"
            key = f"A:R{col-2}:{obj}"
        else:
            pkey = f"L:{pred}"; key = f"L:{obj}" if op != "DISCARD" else f"L:{obj}:discard"
        if op == "DISCARD":
            node(key if d == "L" else key + ":discard", obj + " (discarded)", "discard", sent, col if d == "A" else 6, d, "discarded",
                 op=op, receipt=rec, loss=loss, prov=f)
            if d == "L": nodes[key]["col"] = 5
            edge(pkey, key if d == "L" else key + ":discard", "kill", "Discard")
            continue
        st, t = tested(obj)
        node(key, obj, "repair" if d == "A" else "abstraction", sent, col if d == "A" else 4, d, st,
             op=op, receipt=rec, loss=loss, prov=f, test=t, tier="repaired")
        edge(pkey, key, "repair", op)

# ---------- DIAGRAM L: the ladder ----------
for c in table("L0_observations.md", r"O-\d{4}$"):
    node(f"L:{c[0]}", c[0], "observation", c[1], 2, "L", "observation", prov=c[2])
    m = re.match(r"P00", c[2])
    if c[0] <= "O-0006": edge(f"L:{claims[int(c[0][-1])-1][0]}", f"L:{c[0]}", "prov")
for c in table("L05_groups.md", r"G-\d{3}$"):
    node(f"L:{c[0]}", c[0], "group", c[1], 3, "L", "group", prov=f"L05_groups.md; basis {c[2]}")
    for m in [x.strip() for x in c[3].split(",")]: edge(f"L:{m}", f"L:{c[0]}", "member")
for c in table("L1_abstractions.md", r"A-\d{3}$"):
    st, t = tested(c[0])
    node(f"L:{c[0]}", c[0], "abstraction", c[2], 4, "L", st, prov="L1_abstractions.md", test=t, tier="tier 1")
    edge(f"L:{c[1]}", f"L:{c[0]}")
# move tier-1 abstractions to col 4, repaired to col 5
for k, n in nodes.items():
    if n["diagram"] == "L" and n["kind"] == "abstraction" and n.get("tier") == "repaired": n["col"] = 5
# receipts for repaired abstractions
for k, n in list(nodes.items()):
    if n["diagram"] == "L" and n.get("tier") == "repaired":
        for o in re.findall(r"O-\d{4}", n.get("receipt", "")): edge(f"L:{o}", k, "receipt", "receipt")
surplus = table("L2_surplus.md", r"A-\d{3}-S\d") + table("L4_repairs_round1.md", r"A-\d{3}v2-S\d")
for c in surplus:
    sid = c[0]; parent = re.match(r"(A-\d{3}(?:v2)?)-S\d", sid).group(1)
    st, t = tested(sid)
    node(f"L:{sid}", sid, "surplus", c[1], 6, "L", st, entailed=c[2], absent=c[3], surface=c[4],
         prov="L2_surplus.md" if "v2" not in sid else "L4_repairs_round1.md", test=t)
    edge(f"L:{parent}", f"L:{sid}", "surplus")
# revisions, in both diagrams
REVS = []
for f in ("L4_repairs_round2.md", "L4_repairs_round3.md", "L4_repairs_round4.md"):
    for c in table(f, r"REV-\d$"):
        st, t = tested(c[0]); REVS.append(c[0])
        for d in ("L", "A"):
            node(f"{d}:{c[0]}", c[0], "revision", c[1], 9 if d == "L" else 7, d, st, prov=f, test=t)
for b in ("A-001", "A-002v2", "A-003v2"):
    for rv in REVS:
        pass
for b, revs in (("A-001", REVS), ("A-002v2", REVS), ("A-003v2", REVS), ("A-004", ["REV-5", "REV-6"]), ("A-005", ["REV-5", "REV-6"])):
    for rv in revs: edge(f"L:{b}", f"L:{rv}", "basis", "basis")
for b in ("A:R1:S-005.aR", "A:R2:S-005.bR", "A:R2:S-006.aR2", "A:R1:S-006.bR"):
    if b in nodes:
        for rv in REVS: edge(b, f"A:{rv}", "basis", "basis")
# tier 2 (Steps 5-6)
for c in table("L56_tier2.md", r"G-1\d\d$"):
    node(f"L:{c[0]}", c[0], "group", c[1], 7, "L", "group", prov="L56_tier2.md (Step 5); members provisionally survivors under O-07")
    for m in [x.strip() for x in c[3].split(",")]: edge(f"L:{m}", f"L:{c[0]}", "member")
for c in table("L56_tier2.md", r"T-\d{3}$"):
    st, t = tested(c[0])
    node(f"L:{c[0]}", c[0], "abstraction", c[2], 7, "L", st, prov="L56_tier2.md (Step 6)", test=t, tier="tier 2")
    edge(f"L:{c[1]}", f"L:{c[0]}")
for c in table("L56_tier2.md", r"T-\d{3}-S\d$"):
    st, t = tested(c[0])
    node(f"L:{c[0]}", c[0], "surplus", c[1], 8, "L", st, entailed=c[2], absent=c[3], surface=c[4], prov="L56_tier2.md", test=t)
    edge(f"L:{re.match(r'(T-\d{3})', c[0]).group(1)}", f"L:{c[0]}", "surplus")
if "L:A-002-S2" in nodes:
    nodes["L:A-002-S2"]["op"] = "Discarded after failing CX-003 (L4_repairs_round1.md)"
for k in ("L:A-002-S1", "L:A-003-S1"):
    if k in nodes:
        nodes[k]["op"] = "Archived in pass 2: belongs to a parent phrasing that failed CX-002 (L4_repairs_round3.md)"; nodes[k]["status"] = "archived"
edges = [e for e in edges if e["a"] in nodes and e["b"] in nodes]

runs = []
for run in RUNS:
    meta = rd(f"CX/{run}_meta.md")
    runs.append(dict(run=run, model=re.search(r"reported: ([^;]+);", meta).group(1).strip(),
        gid=re.search(r"id: (\S+)", meta).group(1), diff=re.search(r"Integrity diff \(must be empty\): (\S+)", meta).group(1),
        n=len([l for l in rd(f"CX/{run}_statements.tsv").splitlines() if l.strip()]),
        stands=sum(1 for o,(r_,_,v) in cx.items() if r_==run and v=="STANDS"),
        broken=sum(1 for o,(r_,_,v) in cx.items() if r_==run and v=="BROKEN"),
        reply=rd(f"CX/{run}_reply.txt"), prompt=rd(f"CX/{run}_prompt.txt")))
openitems = [l[2:] for l in rd("OPEN.md").splitlines() if l.startswith("- O-")]
openitems += ["| ".join(c[:2]) for c in table("OPEN.md", r"O-0[1-6]$")]
data = dict(nodes=list(nodes.values()), edges=edges, runs=runs, piece=src, p4=rd("P04_reply.txt"),
            p4prompt=rd("P04_prompt.txt"), tally=rd("CX_tally.md").splitlines()[-1], open=openitems,
            rulings=rd("RULINGS.md"))
tpl = open(os.path.join(os.path.dirname(__file__), "diagram_template.html"), encoding="utf-8").read()
js = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
open(OUT, "w", encoding="utf-8").write(tpl.replace("/*__DATA__*/null", js))
from collections import Counter
print("nodes", len(nodes), Counter(n["diagram"] for n in nodes.values()), "edges", len(edges))
print(Counter((n["diagram"], n["col"]) for n in nodes.values()))
