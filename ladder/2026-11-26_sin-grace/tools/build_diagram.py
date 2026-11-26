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
    m = re.match(r"(CX-\d{3})(?: #(\d+))?", f); run, num = m.group(1), int(m.group(2) or 1)
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
# revisions
REVS = []; REVS_A = []; REVS_BY = {"B": [], "C": [], "D": [], "E": [], "F": [], "G": [], "H": [], "I": []}
REV_FILES = (("L4_repairs_round2.md", ("L", "A")), ("L4_repairs_round3.md", ("L", "A")), ("L4_repairs_round4.md", ("L", "A")),
             ("pass4/L4_repairs_round2.md", ("L", "B")), ("pass5/L4_repairs_round2.md", ("L", "C")), ("pass6/L4_repairs_round2.md", ("L", "D")), ("pass7/L4_repairs_round2.md", ("L", "E")), ("pass8/L4_repairs_round2.md", ("L", "F")), ("pass9/L4_revisions.md", ("L", "G")), ("pass10/L4_revisions.md", ("L", "H")), ("pass12/L4_revisions.md", ("L", "I")))
REVCOL = {"L": 9, "A": 7, "B": 6, "C": 5, "D": 4, "E": 5, "F": 4, "G": 4, "H": 3, "I": 2}
for f, ds in REV_FILES:
    for c in table(f, r"REV-\d+$"):
        if len(c) < 2 or c[0] in REVS: continue
        st, t = tested(c[0]); REVS.append(c[0])
        if "A" in ds: REVS_A.append(c[0])
        else: REVS_BY[ds[1]].append(c[0])
        for d in ds:
            node(f"{d}:{c[0]}", c[0], "revision", c[1], REVCOL[d], d, st, prov=f, test=t)
for b, revs in (("A-001", REVS), ("A-002v2", REVS), ("A-003v2", REVS), ("A-004", ["REV-5", "REV-6", "REV-7", "REV-9", "REV-10", "REV-11"] + REVS_BY["D"] + REVS_BY["E"]),
                ("A-005", ["REV-5", "REV-6"]), ("A-006", REVS_BY["B"] + REVS_BY["C"] + REVS_BY["D"] + REVS_BY["E"]), ("A-007", REVS_BY["C"] + REVS_BY["D"] + REVS_BY["E"]),
                ("A-009v3", REVS_BY["E"]), ("A-010v2", ["REV-16"] + REVS_BY["F"] + REVS_BY["G"] + REVS_BY["H"]), ("A-011v6a", REVS_BY["F"] + REVS_BY["G"] + REVS_BY["H"]), ("A-011v6b", REVS_BY["F"] + REVS_BY["G"] + REVS_BY["H"]), ("A-012", ["REV-19"] + REVS_BY["G"] + REVS_BY["H"])):
    for rv in revs: edge(f"L:{b}", f"L:{rv}", "basis", "basis")
for rv in REVS_BY["B"]: edge("L:REV-5", f"L:{rv}", "repair", "carried forward by ruling")
for rv in REVS_BY["C"]: edge("L:REV-7", f"L:{rv}", "repair", "carried forward by ruling")
for rv in REVS_BY["D"]: edge("L:REV-11", f"L:{rv}", "repair", "carried forward by ruling")
for rv in REVS_BY["E"]: edge("L:REV-14", f"L:{rv}", "repair", "carried forward by ruling")
for rv in REVS_BY["F"]: edge("L:REV-16", f"L:{rv}", "repair", "revised by the author's rulings")
for b in ("A:R1:S-005.aR", "A:R2:S-005.bR", "A:R2:S-006.aR2", "A:R1:S-006.bR"):
    if b in nodes:
        for rv in REVS_A: edge(b, f"A:{rv}", "basis", "basis")

# ---------- PASS DIAGRAMS (pass 4 = B, pass 5 = C) ----------
PASSES = []
def build_pass(d, P, pref, piece_label, rounds, basis):
    srcp = re.search(r"## The piece, verbatim.*?\n\n(.+?)\n", rd(P + "P00_source.md"), flags=re.S).group(1)
    node(f"{d}:PIECE", piece_label + " (piece)", "piece", srcp, 0, d, "source", prov=P + "P00_source.md; carried forward by the author's ruling")
    for cid, t, anc in re.findall(r"### (S-\d{3})\nText: (.+)\nAnchor: (.+)", rd(P + "P01_claims.md")):
        node(f"{d}:{cid}", cid, "claim", t, 1, d, "extracted", prov=f"{P}P01_claims.md; anchor {anc}")
        edge(f"{d}:PIECE", f"{d}:{cid}")
    seg_ = segments(rd(P + "P04_reply.txt"), r"^\W*(\d+)\.\s*\**\s*(?:DEMONSTRATED|CONTESTED|FALSE AS STATED)")
    map_ = {l.split()[1]: int(l.split()[0]) for l in rd(P + "P04_numbermap.txt").splitlines() if l.strip()}
    cat_ = {}
    for l in rd(P + "P04_tally.txt").splitlines():
        m = re.match(r"(DEMONSTRATED|CONTESTED|FALSE AS STATED): \d+ (\[.*\])", l)
        if m:
            for i in eval(m.group(2)): cat_[i] = m.group(1)
    for c in table(P + "P03_generalized.md", r"S-\d{3}\.[ab]$"):
        i = c[0]; cat = cat_[i]
        st = {"DEMONSTRATED": "p4dem", "CONTESTED": "p4con", "FALSE AS STATED": "p4false"}[cat]
        node(f"{d}:{i}", i, "assumption", c[2], 2, d, st, prov=f"{P}P03_generalized.md; audited in this pass's P4",
             test=dict(run=f"P4 audit ({P.strip('/')})", num=map_[i], verdict=cat, reply=seg_.get(map_[i], "")))
        edge(f"{d}:{i[:5]}", f"{d}:{i}")
    for c in table(P + "P04R_reformulated.md", r"S-\d{3}"):
        if len(c) < 6: continue
        nid, pred, p4, op, sent, rec = c[:6]
        pid = nid if pred.startswith("(kept") else pred
        st, t = tested(pref + nid)
        node(f"{d}:R1:{nid}", nid + (" (kept)" if pred.startswith("(kept") else ""), "reformulation", sent, 3, d, st,
             op=op, receipt=rec, prov=f"{P}P04R_reformulated.md", test=t)
        edge(f"{d}:{pid}", f"{d}:R1:{nid}", "repair" if op != "none" else "flow", op if op != "none" else "kept")
    for f, col in rounds:
        for c in table(P + f, r"S-\d{3}"):
            if len(c) < 6: continue
            obj, failed, op, sent, rec, loss = c[:6]
            pred = failed_obj(failed)[len(pref):]
            src_ = next((k for k in (f"{d}:R2:{pred}", f"{d}:R1:{pred}") if k in nodes), None)
            if op == "DISCARD":
                key = f"{d}:X:{obj}"
                node(key, obj + " (discarded)", "discard", sent, col, d, "discarded", op=op, receipt=rec, loss=loss, prov=P + f)
                edge(src_ or f"{d}:R1:{obj}", key, "kill", "Discard"); continue
            st, t = tested(pref + obj)
            node(f"{d}:R2:{obj}", obj, "repair", sent, col, d, st, op=op, receipt=rec, loss=loss, prov=P + f, test=t)
            edge(src_, f"{d}:R2:{obj}", "repair", op)
    for b in basis:
        for rv in REVS_BY[d]: edge(f"{d}:{b}", f"{d}:{rv}", "basis", "basis")

build_pass("B", "pass4/", "P4:", "REV-5", (("L4_repairs_round1.md", 4), ("L4_repairs_round2.md", 5)),
           ("R2:S-003.aR", "R1:S-005.bR", "R1:S-006.bR", "R1:S-004.b"))
PASSES.append(dict(id="B", title="Pass 4: REV-5 as the piece", hint="By the author's ruling (\"Use Rev 5.\"), REV-5 became the piece for pass 4: its claims, their assumptions, a fresh audit, repairs, and the revisions that descend from it.",
    cols=["The piece: REV-5", "Claims (P1)", "Assumptions · P4 audit", "Round 1 reformulation · CX-016", "Round 2 repair · CX-019", "Discards", "Revision of REV-5 · CX-020"]))
build_pass("C", "pass5/", "P5:", "REV-7", (("L4_repairs_round1.md", 4),),
           ("R1:S-003.a", "R1:S-004.b", "R1:S-005.b", "R1:S-006.bR", "R2:S-002.bR2"))
build_pass("D", "pass6/", "P6:", "REV-11", (), ("R1:S-004.bR", "R1:S-006.bR", "R1:S-003.a", "R1:S-005.a"))
PASSES.append(dict(id="D", title="Pass 6: REV-11 as the piece", hint="By the author's ruling (\"REV-11 (Recommended)\"), REV-11 became the piece for pass 6. All eleven tested assumptions passed; S-002.b, S-007.a and S-007.b were discarded at the audit stage (see pass6/P04R_reformulated.md). Abstraction A-009 and its repairs are in Diagram 1.",
    cols=["The piece: REV-11", "Claims (P1)", "Assumptions · P4 audit", "Round 1 reformulation · CX-029", "Revision of REV-11 · CX-033, CX-035"]))
build_pass("E", "pass7/", "P7:", "REV-14", (("L4_repairs_round1.md", 4),), ("R1:S-003.a", "R1:S-004.aR", "R1:S-005.aR", "R1:S-006.a"))
PASSES.append(dict(id="E", title="Pass 7: REV-14 as the piece", hint="By the author's ruling (\"REV-14 (Recommended)\"), REV-14 became the piece for pass 7. S-002.a and S-007.a were discarded at the audit stage (see pass7/P04R_reformulated.md). Abstraction A-010 and its repair are in Diagram 1.",
    cols=["The piece: REV-14", "Claims (P1)", "Assumptions · P4 audit", "Round 1 reformulation · CX-036", "Round 2 repair and discards · CX-039", "Revision of REV-14 · CX-041"]))
PASSES.append(dict(id="C", title="Pass 5: REV-7 as the piece", hint="By the author's ruling (\"with Rev 7.\"), REV-7 became the piece for pass 5. S-003.b was discarded at the audit stage in favour of abstraction A-007, shown in Diagram 1.",
    cols=["The piece: REV-7", "Claims (P1)", "Assumptions · P4 audit", "Round 1 reformulation · CX-021", "Round 2 repair and discards · CX-024", "Revision of REV-7 · CX-027, CX-028"]))

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
for c in table("L1_abstractions.md", r"A-\d{3}v\d[a-z]?$"):
    if len(c) < 6: continue
    obj, failed, op, sent, rec, loss = c[:6]
    st, t = tested(obj)
    node(f"L:{obj}", obj, "abstraction", sent, 5, "L", st, op=op, receipt=rec, loss=loss, prov="L1_abstractions.md (repairs; see the receipt and the failing run)", test=t, tier="repaired")
    edge(f"L:{failed_obj(failed)}", f"L:{obj}", "repair", op)
    for o in re.findall(r"O-\d{4}", rec): edge(f"L:{o}", f"L:{obj}", "receipt", "receipt")
for c in table("L2_surplus.md", r"A-\d{3}v\d-S\d"):
    st, t = tested(c[0])
    node(f"L:{c[0]}", c[0], "surplus", c[1], 6, "L", st, entailed=c[2], absent=c[3], surface=c[4], prov="L2_surplus.md (pass 5)", test=t)
    edge(f"L:{re.match(r'(A-\d{3}v\d)', c[0]).group(1)}", f"L:{c[0]}", "surplus")
for k, why in (("L:A-008-S1", "Archived in pass 5 with failed parent A-008 (it also failed CX-023 #3)"),
               ("L:A-008-S2", "Archived in pass 5: passed against parent phrasing A-008, which failed CX-022"),
               ("L:A-008v2-S1", "Parent A-008v2 failed CX-025; this passes as its own sentence only"),
               ("L:A-009-S1", "Discarded in pass 6 after failing CX-031 #1"),
               ("L:A-009-S2", "Archived in pass 6: passed against parent phrasing A-009, which failed CX-030"),
               ("L:A-010-S1", "Derived under A-010 (failed CX-037); re-derived unchanged under A-010v2; CX-038 result stands for this exact sentence"),
               ("L:A-010-S2", "Derived under A-010 (failed CX-037); re-derived unchanged under A-010v2; CX-038 result stands for this exact sentence"),
               ("L:A-011-S2", "Discarded in pass 8 after failing CX-045 #2"),
               ("L:A-011v3-S1", "Archived in pass 8: A-011v5 and its split no longer address new wrongs"),
               ("L:A-012-S1", "INVALID DERIVATION (operator's own audit): A-012 exempts only youth or a faultless loss; S1 dropped that condition (Ladder 340)")):
    if k in nodes:
        nodes[k]["op"] = why
        if k not in ("L:A-008-S1", "L:A-009-S1", "L:A-010-S1", "L:A-010-S2", "L:A-011-S2", "L:A-012-S1"): nodes[k]["status"] = "archived"
for sid in ("A-010-S1", "A-010-S2"): edge("L:A-010v2", f"L:{sid}", "surplus", "re-derived")
if "L:A-002-S2" in nodes:
    nodes["L:A-002-S2"]["op"] = "Discarded after failing CX-003 (L4_repairs_round1.md)"
for k in ("L:A-002-S1", "L:A-003-S1"):
    if k in nodes:
        nodes[k]["op"] = "Archived in pass 2: belongs to a parent phrasing that failed CX-002 (L4_repairs_round3.md)"; nodes[k]["status"] = "archived"
edges = [e for e in edges if e["a"] in nodes and e["b"] in nodes]

runs = []
RUNS_ALL = sorted(os.path.basename(f)[:6] for f in glob.glob(os.path.join(R, "CX/CX-*_statements.tsv")))
for run in RUNS_ALL:
    meta = rd(f"CX/{run}_meta.md")
    if not os.path.exists(os.path.join(R, f"CX/{run}_reply.txt")):
        runs.append(dict(run=run, model="(interrupted: no reply)", gid="-", diff="-", n=len([l for l in rd(f"CX/{run}_statements.tsv").splitlines() if l.strip()]), stands=0, broken=0, reply="(no reply captured)\n\n" + meta, prompt=rd(f"CX/{run}_prompt.txt")))
        continue
    runs.append(dict(run=run, model=re.search(r"reported: ([^;]+);", meta).group(1).strip(),
        gid=re.search(r"id: (\S+)", meta).group(1), diff=re.search(r"Integrity diff \(must be empty\): (\S+)", meta).group(1),
        n=len([l for l in rd(f"CX/{run}_statements.tsv").splitlines() if l.strip()]),
        stands=sum(1 for o,(r_,_,v) in cx.items() if r_==run and v=="STANDS"),
        broken=sum(1 for o,(r_,_,v) in cx.items() if r_==run and v=="BROKEN"),
        reply=rd(f"CX/{run}_reply.txt"), prompt=rd(f"CX/{run}_prompt.txt")))
openitems = [l[2:] for l in rd("OPEN.md").splitlines() if l.startswith("- O-")]
openitems += ["| ".join(c[:2]) for c in table("OPEN.md", r"O-0[1-6]$")]
def build_pass8(d, P, piece_label="REV-16", au_edges=None, stmt_file="AU_statements.md", prefix="| AU-"):
    srcp = re.search(r"## The piece, verbatim.*?\n\n(.+?)\n", rd(P + "P00_source.md"), flags=re.S).group(1)
    node(f"{d}:PIECE", piece_label + " (piece)", "piece", srcp, 0, d, "source", prov=P + "P00_source.md")
    last = {}; depth = {}; sec = 0
    for l in rd(P + stmt_file).splitlines():
        if l.startswith("## "): sec += 1; continue
        if not l.startswith(prefix): continue
        c = [x.strip() for x in l.strip().strip("|").split("|")]
        if len(c) == 3:
            st, t = tested(c[0]); key = f"{d}:{c[0]}"
            node(key, c[0], "assumption", c[2], 1, d, st, prov=f"{P}AU_statements.md; source: {c[1]}", test=t)
            last[c[0]] = key; depth[key] = 1
        elif len(c) >= 6:
            obj, failed, op, sent, rec, loss = c[:6]
            pred = failed_obj(failed); pkey = last.get(pred)
            col = depth.get(pkey, 1) + 1; key = f"{d}:{obj}:{sec}"
            if op == "DISCARD":
                node(key, obj + " (discarded)", "discard", sent, col, d, "discarded", op=op, receipt=rec, loss=loss, prov=P + "AU_statements.md")
                if pkey: edge(pkey, key, "kill", "Discard")
            else:
                st, t = tested(obj)
                node(key, obj, "repair", sent, col, d, st, op=op, receipt=rec, loss=loss, prov=P + "AU_statements.md", test=t)
                if pkey: edge(pkey, key, "repair", op)
            last[obj] = key; depth[key] = col
    for rv in REVS_BY[d]: edge(f"{d}:PIECE", f"{d}:{rv}", "repair", "revised by ruling")
    if au_edges is None:
        au_edges = (("AU-001", ["REV-17"]), ("AU-002", ["REV-17"]), ("AU-001R", ["REV-18", "REV-19", "REV-20"]), ("AU-003R2", ["REV-19"]), ("AU-008", ["REV-20"]))
    if os.path.exists(os.path.join(R, P + "L2_implications.md")):
        for l in rd(P + "L2_implications.md").splitlines():
            if not l.startswith("| IMP-") and not l.startswith("| CJ-"): continue
            c = [x.strip() for x in l.strip().strip("|").split("|")]
            st, t = tested(c[0]); key = f"{d}:{c[0]}"
            if c[0].startswith("IMP-"):
                node(key, c[0], "surplus", c[1], 2, d, st, entailed=c[2], absent=c[3], surface=c[4], prov=P + "L2_implications.md", test=t)
                for au in ("AU-010", "AU-011"):
                    if au in last: edge(last[au], key, "surplus")
            else:
                col = 3 if c[0].endswith("R") else 2
                node(key, c[0], "repair" if c[0].endswith("R") else "abstraction", c[1], col, d, st, op=c[2], surface=c[3], prov=P + "L2_implications.md", test=t)
                if c[0].endswith("R"): edge(f"{d}:{c[0][:-1]}", key, "repair", "Split")
                elif "AU-011" in last: edge(last["AU-011"], key, "flow", "conjecture")
            last[c[0]] = key
        if f"{d}:IMP-001" in nodes:
            nodes[f"{d}:IMP-001"]["op"] = "INVALID DERIVATION (operator's own audit): a bound on what is required is a ceiling, not a requirement that fills it; discarded"
    for au, revs in au_edges:
        if au in last:
            for rv in revs: edge(last[au], f"{d}:{rv}", "basis", "basis")
build_pass8("F", "pass8/")
build_pass8("G", "pass9/", "REV-20", (("AU-006R3", ["REV-22"]), ("AU-010", ["REV-21", "REV-22"])))
build_pass8("H", "pass10/", "REV-22", (("AU-012R", ["REV-24"]),))
build_pass8("I", "pass12/", "REV-24", (("P-03", ["REV-25", "REV-26"]), ("P-04", ["REV-25", "REV-26"]), ("P-06", ["REV-26"])), stmt_file="POEM_statements.md", prefix="| P-")
PASSES.append(dict(id="I", title="Pass 12: the author's poem, and REV-24 revised by ruling", hint="The poem's definitions were tested word for word (edits labeled in pass12/POEM_statements.md); all failed as freestanding claims. The author ruled grace to be the facing of our own creation, named it sin's contrary, and made repentance the facing of God's creation; REV-25 passed and REV-26 failed.",
    cols=["The piece: REV-24", "The poem's definitions (tested)", "Revisions · CX-087"]))
PASSES.append(dict(id="H", title="Pass 10: REV-22, repentance and the facing of God's creation", hint="A directed pass. The author ruled that the repentance clause takes in facing God's creation as God's work, and oneself within it as a whole, as an implication and not an objective. The freestanding claims were scoped to the piece's own repentance; the implication form (AU-012R) passed and the precondition form (AU-010R2) failed.",
    cols=["The piece: REV-22", "Author's rulings (tested)", "Repairs", "Revisions · CX-078"]))
PASSES.append(dict(id="G", title="Pass 9: REV-20, the author's rulings, and facing God's creation", hint="A directed pass. The author ruled \"after understanding\", that \"for what it is\" includes moral character, and that having grace means giving it; the author's question on repentance and facing God's creation was stated as exact sentences, its implications derived (IMP) and two operator conjectures (CJ) tested.",
    cols=["The piece: REV-20", "Author's statements (tested)", "Repairs and implications", "Second repair", "Revisions · CX-070"]))
PASSES.append(dict(id="F", title="Pass 8: the author's rulings applied to REV-16", hint="A directed pass. The author's statements on grace, children, rebellion and repentance were tested verbatim (§4.3) and repaired where they broke; the abstraction for what \"rightly calls for\" presupposes (A-011 to A-011v6a/b) and A-012 are in Diagram 1. CX-048 to CX-052 were interrupted and rerun as CX-053 to CX-057.",
    cols=["The piece: REV-16", "Author's statements (tested)", "First repair", "Second repair", "Revisions · CX-046, CX-057, CX-064"]))
PASSES.sort(key=lambda p: p["id"])
data = dict(nodes=list(nodes.values()), edges=edges, passes=PASSES, runs=runs, piece=src, p4=rd("P04_reply.txt"),
            p4prompt=rd("P04_prompt.txt"), tally=rd("CX_tally.md").splitlines()[-1], open=openitems,
            rulings=rd("RULINGS.md"))
tpl = open(os.path.join(os.path.dirname(__file__), "diagram_template.html"), encoding="utf-8").read()
js = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
open(OUT, "w", encoding="utf-8").write(tpl.replace("/*__DATA__*/null", js))
from collections import Counter
print("nodes", len(nodes), Counter(n["diagram"] for n in nodes.values()), "edges", len(edges))
print(Counter((n["diagram"], n["col"]) for n in nodes.values()))
