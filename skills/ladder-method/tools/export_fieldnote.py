"""Export a Ladder run as a Fieldnote LadderRecord v1 file (bare record, as the app exports).

Usage: python3 -I tools/export_fieldnote.py RUN_DIR OUT.json [TREE_NAME]

Reads RUN_DIR/ladder_data.json (written by tools/build_diagram.py) and the CX meta files.
Mapping (see the skill reference fieldnote-record.md):
  observation -> observation; group -> group; surplus implication -> implication (surplus: true);
  entailment conditional (E-*) -> implication of its pass's revision (surplus: false);
  claim, assumption, definition, reformulation, repaired sentence, abstraction, revision -> abstraction;
  every verdict -> test (holds / false / insufficient_evidence), attached to an implication;
  a sentence tested directly gets an implication carrying its own words (surplus: false);
  Narrow / Split -> repair with resulting abstractions; Discard -> repair (discard) and an archived abstraction;
  the piece and each pass's heading -> note panels (planning, not evidence).
Untested stays untested. A ruled definition carries no test.
"""
import json, math, os, re, sys
from collections import defaultdict, OrderedDict

R, OUT = sys.argv[1], sys.argv[2]
TREE = sys.argv[3] if len(sys.argv) > 3 else "Sin and grace ladder"
RUN_TIME = "2026-11-26T12:00:00.000Z"
data = json.load(open(os.path.join(R, "ladder_data.json"), encoding="utf-8"))
NODES, EDGES, PASSES = data["nodes"], data["edges"], data["passes"]
DIAG_ORDER = ["L", "A"] + sorted(p["id"] for p in PASSES)
DIAG_TITLE = {"L": "Passes 1 to 3: observations recorded for the first Ladder", "A": "Pass 1: observations behind the piece's claims"}
DIAG_TITLE.update({p["id"]: p["title"] for p in PASSES})
DIAG_HINT = {p["id"]: p.get("hint", "") for p in PASSES}
DIAG_HINT["L"] = "Observations, groups, abstractions, surplus implications, repairs and every revision of the piece."
DIAG_HINT["A"] = "The piece's claims (P01), their assumptions (P03), the fresh audit (P4) and the reformulations."
# the schedule: one band per pass, earliest at the bottom, latest at the top
BAND_ORDER = ["1"] + [d for d in DIAG_ORDER if d not in ("L", "A")]
if "H" in BAND_ORDER: BAND_ORDER.insert(BAND_ORDER.index("H") + 1, "X11")   # pass 11 ran no tests; its observations still have a place
PASS_BAND = {4: "B", 5: "C", 6: "D", 7: "E", 8: "F", 9: "G", 10: "H", 11: "X11", 12: "I", 13: "J", 14: "K", 15: "M", 16: "N", 17: "O"}
band_of_diag = lambda d: "1" if d in ("L", "A") else d
BAND_TITLE = {"1": "Passes 1 to 3: the piece, its claims, and the first Ladder"}
BAND_TITLE.update({d: DIAG_TITLE[d] for d in BAND_ORDER[1:] if d in DIAG_TITLE})
BAND_TITLE["X11"] = "Pass 11: what is facing? (the author's message, recorded as evidence, not as a definition)"
BAND_HINT = {"1": DIAG_HINT["A"] + " " + DIAG_HINT["L"]}
BAND_HINT.update({d: DIAG_HINT.get(d, "") for d in BAND_ORDER[1:]})
BAND_HINT["X11"] = "No Counter-AI test ran in this pass. Its observations are the author's message on facing (pass11/INPUT_facing.md)."

def iso(t):
    m = re.match(r"(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.(\d+))?", t)
    return f"{m.group(1)}T{m.group(2)}.{(m.group(3) or '0').ljust(3, '0')[:3]}Z"

def meta_time(run):
    p = os.path.join(R, "CX", f"{run}_meta.md") if run.startswith("CX") else os.path.join(R, "P04_meta.md")
    try:
        m = re.search(r"Time UTC:\s*(\S+)", open(p, encoding="utf-8").read())
        return iso(m.group(1)) if m else RUN_TIME
    except OSError:
        return RUN_TIME

def norm_label(l):
    return re.sub(r" \((discarded|kept|pass 14|piece)\)$", "", l)

# ---------- unique objects: same label and same text is one object ----------
obj_of = {}            # node key -> object key
objects = OrderedDict()
def okey(n):
    lab = norm_label(n["label"])
    return (lab, n["text"]) if n["kind"] != "piece" or not lab.startswith("REV-") else (lab, None)
rev_text = {}
for n in NODES:
    if n["kind"] == "revision": rev_text[norm_label(n["label"])] = n["text"]
for n in sorted(NODES, key=lambda n: DIAG_ORDER.index(n["diagram"])):
    if n["kind"] == "discard": continue
    lab, txt = okey(n)
    if txt is None: txt = rev_text.get(lab, n["text"])
    k = (lab, txt)
    obj_of[n["key"]] = k
    if k not in objects:
        objects[k] = dict(label=lab, text=txt, nodes=[n], kind=n["kind"])
    else:
        objects[k]["nodes"].append(n)
discard_of = {n["key"]: n for n in NODES if n["kind"] == "discard"}

def ftype(o):
    k, lab = o["kind"], o["label"]
    if k == "observation": return "observation"
    if k == "group": return "group"
    if k == "surplus": return "implication"
    if k == "piece": return "panel"
    if re.match(r"E-\d", lab): return "implication"
    return "abstraction"

def best(o, f):
    for n in o["nodes"]:
        if n.get(f): return n[f]
    return None

def tests_of(o):
    """Every distinct verdict the object faced: audits first, then Counter-AI runs in run order."""
    seen, out = set(), []
    for n in o["nodes"]:
        t = n.get("test")
        if t and t.get("run") and (t["run"], t.get("num")) not in seen:
            seen.add((t["run"], t.get("num"))); out.append(t)
    return sorted(out, key=lambda t: (t["run"].startswith("CX"), t["run"], t.get("num") or 0))

def test_of(o):
    """The verdict that sets the object's status: the latest Counter-AI verdict, else the audit."""
    ts = tests_of(o)
    return ts[-1] if ts else None

def status_of(o):
    return next((n["status"] for n in o["nodes"] if n["status"] not in ("source", "extracted")), o["nodes"][0]["status"])

def pass_home(o):
    for n in o["nodes"]:
        if n["diagram"] not in ("L", "A"): return n["diagram"]
    m = re.search(r"pass(\d+)/", best(o, "prov") or "")
    return o["nodes"][0]["diagram"]

# ---------- IDs ----------
ids = {}
counters = defaultdict(int)
def nid(prefix, width):
    counters[prefix] += 1
    return f"{prefix}-{str(counters[prefix]).zfill(width)}"
used_A = set()
for k, o in objects.items():
    t = ftype(o)
    if t == "observation": ids[k] = o["label"]
    elif t == "group": ids[k] = o["label"]
    elif t == "abstraction" and re.fullmatch(r"A-\d{3}", o["label"]):
        ids[k] = o["label"]; used_A.add(o["label"])
counters["A"] = 100
counters["G"] = 200
for k, o in objects.items():
    if k in ids: continue
    t = ftype(o)
    if t == "abstraction": ids[k] = nid("A", 3)
    elif t == "implication": ids[k] = nid("I", 4)
    elif t == "panel": ids[k] = nid("P", 4)
fid = lambda node_key: ids.get(obj_of.get(node_key))

# ---------- layout (shared with the HTML viewer) ----------
def plate_size(text, kind):
    n = len(text or "")
    w = 220 if n <= 200 else 320 if n <= 600 else 460 if n <= 1400 else 640
    cpl = max(18, (w - 36) / 7.4)
    lines = sum(max(1, math.ceil(len(p) / cpl)) for p in (text or " ").split("\n"))
    h = max(108, min(1000, 92 + lines * 20))
    return w, h

home = {}  # object key -> (diagram, col, order)
col_members = defaultdict(list)
for n in NODES:
    k = obj_of.get(n["key"])
    if k is None or k in home: continue
    home[k] = n["diagram"]
    col_members[(n["diagram"], n["col"])].append(k)
# observations live with the pass that first cites them (L keeps those in the L0.5 groups), so each
# pass's group region (members' bounds + 18, as the app draws it) stays inside its own district
cite_first = {}
for n in sorted(NODES, key=lambda n: DIAG_ORDER.index(n["diagram"])):
    if n["kind"] == "observation": continue
    blob = " ".join(str(n.get(f, "")) for f in ("prov", "receipt", "op", "text", "loss", "surface", "entailed"))
    for m in re.findall(r"O-\d{4}", blob): cite_first.setdefault(m, n["diagram"])
in_real_group = set()
for e in EDGES:
    if e["kind"] == "member": in_real_group.add(obj_of.get(e["a"]))
for k, o in objects.items():
    if o["kind"] != "observation": continue
    d0 = home.get(k)
    want = "L" if k in in_real_group else cite_first.get(o["label"], "L")
    if want == d0 or want == "L": continue
    for key, lst in list(col_members.items()):
        if k in lst: lst.remove(k)
    home[k] = want
    col_members[(want, -1)].append(k)
layout, bsize = {}, {}
x0 = 0
district_x = {}
for d in DIAG_ORDER:
    cols = sorted(c for (dd, c) in col_members if dd == d)
    if not cols: continue
    district_x[d] = x0
    x = x0
    for c in cols:
        ks = col_members[(d, c)]
        if not ks: continue
        if (d == "L" and c == 2 and len(ks) > 40) or (c == -1 and len(ks) > 8):   # observations: a grid, in ID order
            ks = sorted(ks, key=lambda k: k[0]); per = 6 if d == "L" else 3; colw = 0
            sizes = [plate_size(objects[k]["text"], "observation") for k in ks]
            cw = max(s[0] for s in sizes)
            rows = math.ceil(len(ks) / per); y = 0
            for r_ in range(rows):
                row = list(range(r_ * per, min(len(ks), (r_ + 1) * per)))
                rh = max(sizes[i][1] for i in row)
                for j, i in enumerate(row):
                    layout[ks[i]] = (x + j * (cw + 40) + 110, y + 54); bsize[ks[i]] = sizes[i]
                y += rh + 40
            x += per * (cw + 40) + 80
            continue
        y, cw = 0, 0
        for k in ks:
            w, h = plate_size(objects[k]["text"], ftype(objects[k]))
            layout[k] = (x + 110, y + 54); bsize[k] = (w, h)
            y += h + 48; cw = max(cw, w)
        x += cw + 90
    x0 = x + 400

# ---------- build the record ----------
rec = dict(version=1, panels=[], observations=[], groups=[], abstractions=[], implications=[], tests=[],
           convergences=[], invariants=[], repairs=[], edges=[])
edge_seen = set()
def add_edge(a, b, kind):
    if not a or not b or a == b or (a, b, kind) in edge_seen: return
    edge_seen.add((a, b, kind))
    rec["edges"].append(dict(id=f"E-{len(rec['edges']) + 1:05d}", fromId=a, toId=b, kind=kind, createdAt=RUN_TIME))

def base(k, kind):
    o = objects[k]
    lx, ly = layout.get(k, (0, 0)); w, h = bsize.get(k, (220, 108))
    b = dict(id=ids[k], kind=kind, createdAt=RUN_TIME, updatedAt=RUN_TIME, archived=False,
             layout=dict(x=round(lx), y=round(ly)), tags=[f"run:{o['label']}", f"pass:{pass_home(o) if o['kind'] != 'observation' else obs_band.get(o['label'], '1')}"])
    if (w, h) != (220, 108): b["boardSize"] = dict(width=w, height=h)
    notes = []
    for f, lab in (("prov", "Source"), ("op", "Operation"), ("receipt", "Receipt"), ("loss", "Named loss"),
                   ("original", "Original"), ("entailed", "Entailed by"), ("absent", "Absent from"), ("surface", "Test surface")):
        v = best(o, f)
        if v: notes.append(f"{lab}: {v}")
    if notes: b["notes"] = "\n".join(notes)
    return b

kinds_by_id = {}
# groups first (members resolved later)
real_groups = {k for k, o in objects.items() if ftype(o) == "group"}
group_members = defaultdict(list)
for e in EDGES:
    if e["kind"] == "member":
        a, b = obj_of.get(e["a"]), obj_of.get(e["b"])
        if a and b and ftype(objects[b]) == "group" and ftype(objects[a]) in ("observation", "abstraction"):
            if ids[a] not in group_members[b]: group_members[b].append(ids[a])

# ---------- bands (the schedule) and each band's observations ----------
# The run clock: each Counter-AI run belongs to one pass. A pass starts at the first run that tested one of its own
# objects; an object shown only in Diagram 1 or 2 is dated by the first run that tested it.
band_start = {"1": 1}
for n in NODES:
    t = n.get("test") or {}
    carried = re.search(r"prior pass|tested earlier|carried|\(pass \d+\)", str(n.get("prov", "")) + " " + n["label"])
    if n["diagram"] not in ("L", "A") and str(t.get("run", "")).startswith("CX") and not carried:
        r_ = int(t["run"][3:]); band_start[n["diagram"]] = min(band_start.get(n["diagram"], r_), r_)
prev_ = 1
for x_ in BAND_ORDER:          # passes start in order
    if x_ in band_start: band_start[x_] = max(band_start[x_], prev_); prev_ = band_start[x_]
print("pass clock (first Counter-AI run of each pass):", {x_: band_start[x_] for x_ in BAND_ORDER if x_ in band_start})
def run_band(r_):
    b_ = "1"
    for x_ in BAND_ORDER:
        if x_ in band_start and band_start[x_] <= r_: b_ = x_
    return b_
def obj_band(k):
    o = objects[k]
    if o["kind"] == "revision":
        ds = [n["diagram"] for n in o["nodes"] if n["kind"] == "revision" and n["diagram"] not in ("L", "A")]
        if ds: return ds[0]
    else:
        ds = [band_of_diag(n["diagram"]) for n in o["nodes"] if n["kind"] != "piece"] or [band_of_diag(n["diagram"]) for n in o["nodes"]]
        b_ = min(ds, key=BAND_ORDER.index)
        if b_ != "1": return b_
    runs = [int(t["run"][3:]) for t in tests_of(o) if t["run"].startswith("CX")]
    return run_band(min(runs)) if runs else "1"
obs_ids = {ids[k] for k, o in objects.items() if ftype(o) == "observation"}
cites = defaultdict(set)    # non-observation object -> observation IDs it cites
for n in NODES:
    k = obj_of.get(n["key"])
    if not k or n["kind"] == "observation": continue
    blob = " ".join(str(n.get(f, "")) for f in ("prov", "receipt", "op", "text", "loss", "surface", "entailed"))
    cites[k].update(m for m in re.findall(r"O-\d{4}", blob) if m in obs_ids)
for e in EDGES:
    if e["kind"] in ("receipt", "prov"):
        a_, b_ = obj_of.get(e["a"]), obj_of.get(e["b"])
        for x_, y_ in ((a_, b_), (b_, a_)):
            if x_ and y_ and ftype(objects[x_]) == "observation" and ftype(objects[y_]) != "observation": cites[y_].add(ids[x_])
in_real = {m for k in real_groups for m in group_members[k]}
# When was each observation recorded? A tester's observation names its run (CX-nnn); an audit's names its pass folder;
# P00/P04 belong to pass 1. Any other (a quote from the author's works, a ruling) arrives at the start of a pass, before
# its tests, so it takes the date of the next dated observation (IDs rise in recording order).
obs_by_id = {ids[k]: objects[k] for k in objects if ftype(objects[k]) == "observation"}
rec_band = {}
for m in sorted(obs_by_id):
    src = best(obs_by_id[m], "prov") or ""
    cx, ps = re.search(r"CX-(\d+)", src), re.search(r"pass(\d+)/", src)
    if cx: rec_band[m] = run_band(int(cx.group(1)))
    elif ps: rec_band[m] = PASS_BAND.get(int(ps.group(1)), "1")
    elif re.match(r"P0\d", src): rec_band[m] = "1"
nxt_ = None
for m in sorted(obs_by_id, reverse=True):
    if m in rec_band: nxt_ = rec_band[m]
    else: rec_band[m] = nxt_ or BAND_ORDER[-1]
# A named group sits in the pass where it reached its final form (its latest member); its members sit in it there.
group_band = {}
for k in real_groups:
    bs = [rec_band[m] for m in group_members[k] if m in rec_band]
    group_band[k] = max(bs, key=BAND_ORDER.index) if bs else "1"
obs_band, home_group = {}, {}
for k in sorted(real_groups, key=lambda k: (BAND_ORDER.index(group_band[k]), ids[k])):
    for m in group_members[k]:
        if m in obs_by_id and m not in obs_band: obs_band[m] = group_band[k]; home_group[m] = k
for m in obs_by_id:
    obs_band.setdefault(m, rec_band[m])
pass_group = {}   # band -> group of the observations first recorded in that pass (outside the L0.5 groups)
late_cites = []
for b_ in BAND_ORDER:
    gid = nid("G", 3); pass_group[b_] = gid
    short = BAND_TITLE[b_].split(":")[0]
    rec["groups"].append(dict(id=gid, kind="group", createdAt=RUN_TIME, updatedAt=RUN_TIME, archived=False,
                              tag=f"{short}: observations first recorded", basis="topical",
                              memberIds=sorted(m for m in obs_ids if obs_band[m] == b_ and m not in in_real), tier=0,
                              layout=dict(x=110, y=0), tags=[f"band:{b_}"],
                              notes="The observations first recorded in this pass, outside the L0.5 groups. Its citations of earlier observations are links. A boundary for the pass, not evidence."))
    later = set()
    for k, ms in cites.items():
        if ftype(objects[k]) != "observation" and obj_band(k) == b_: later |= {m for m in ms if obs_band[m] != b_}
    late_cites += [(m, gid) for m in sorted(later)]
for k in real_groups:
    o = objects[k]
    g = base(k, "group"); g.update(tag=o["text"], basis="instinct", memberIds=group_members[k], tier=0)
    g["tags"].append(f"band:{group_band[k]}")
    rec["groups"].append(g)
groups_of_obs = defaultdict(list)
for g in rec["groups"]:
    for m in g["memberIds"]:
        if g["id"] not in groups_of_obs[m]: groups_of_obs[m].append(g["id"])

# observations
for k, o in objects.items():
    if ftype(o) != "observation": continue
    b = base(k, "observation")
    prov = best(o, "prov") or "Ladder run"
    if rec_band.get(ids[k]) != obs_band.get(ids[k]): b["tags"].append(f"recorded:{rec_band[ids[k]]}")
    b.update(text=o["text"], affectCharge="neutral", groupIds=groups_of_obs[ids[k]],
             provenance=dict(source=prov, firstEncounter="Ladder run 2026-11-26 (sin and grace), L0_observations.md", recordedAt=RUN_TIME))
    rec["observations"].append(b)
for g in rec["groups"]:
    for m in g["memberIds"]: add_edge(m, g["id"], "member_of")
for m, gid in late_cites: add_edge(m, gid, "related")

# panels: the piece, and one heading per pass
for k, o in objects.items():
    if ftype(o) != "panel": continue
    p = base(k, "panel")
    p.update(panelType="regular", title="The piece (P00), verbatim", detail=o["text"], voice="note", history=[])
    rec["panels"].append(p)
heading_of = {}
for b_ in BAND_ORDER:
    pid = nid("P", 4); heading_of[b_] = pid
    rec["panels"].append(dict(id=pid, kind="panel", createdAt=RUN_TIME, updatedAt=RUN_TIME, archived=False,
                              panelType="regular", title=BAND_TITLE[b_], detail=BAND_HINT[b_], voice="note",
                              history=[], layout=dict(x=110, y=0), boardSize=dict(width=460, height=220),
                              tags=[f"band:{b_}", "heading"]))

# edges by object
out_edges, in_edges = defaultdict(list), defaultdict(list)
for e in EDGES:
    a, b = obj_of.get(e["a"]), obj_of.get(e["b"])
    if e["kind"] == "kill":
        a = obj_of.get(e["a"]); b = None
    out_edges[a].append((e, b)); in_edges[b].append((e, a))

# source groups for abstractions
src_group = {}
for k, o in objects.items():
    if ftype(o) != "abstraction": continue
    for e, a in in_edges[k]:
        if a and ftype(objects[a]) == "group" and e["kind"] == "flow":
            src_group[k] = ids[a]; break
changed = True
while changed:
    changed = False
    for k, o in objects.items():
        if ftype(o) != "abstraction" or k in src_group: continue
        for e, a in in_edges[k]:
            if e["kind"] == "repair" and a in src_group:
                src_group[k] = src_group[a]; changed = True; break

# repairs
repairs, repaired_out = [], defaultdict(list)
succ_repair = {}
for k, o in objects.items():
    groups_ = defaultdict(list)
    for e, b in out_edges[k]:
        if e["kind"] == "repair" and b and re.match(r"(Narrow|Split)", e.get("label", "")):
            if ftype(o) == "abstraction" and ftype(objects[b]) == "abstraction":
                groups_["split" if e["label"].startswith("Split") else ("narrow", b)].append(b)
    for gk, succs in groups_.items():
        outcome = "split" if gk == "split" else "narrow"
        rid = nid("R", 3)
        receipt = " | ".join(filter(None, (best(objects[s], "receipt") for s in succs))) or "(receipt not recorded)"
        loss = " | ".join(filter(None, (best(objects[s], "loss") for s in succs)))
        fresh = any(test_of(objects[s]) for s in succs)
        rp = dict(id=rid, kind="repair", createdAt=RUN_TIME, updatedAt=RUN_TIME, archived=False, targetAbstractionId=ids[k],
                  outcome=outcome, antiAdHocReceipt=receipt, resultingAbstractionIds=[ids[s] for s in succs], facesFreshSurplus=fresh,
                  tags=[f"run:{o['label']}"])
        if loss: rp["notes"] = f"Named loss: {loss}"
        lx, ly = layout.get(k, (0, 0)); rp["layout"] = dict(x=round(lx + 160), y=round(ly + 60))
        repairs.append(rp); repaired_out[k].append((outcome, rid))
        add_edge(ids[k], rid, "predecessor")
        for s in succs:
            add_edge(rid, ids[s], "successor"); succ_repair[s] = rid
# version chains across passes: X-nnvK is repaired from X-nnv(K-1) (or X-nn) when no repair edge says otherwise
by_label = defaultdict(list)
for k, o in objects.items():
    if ftype(o) == "abstraction": by_label[o["label"]].append(k)
for k, o in objects.items():
    m = re.fullmatch(r"([A-Z]+-\d+)v(\d+)", o["label"])
    if not m or ftype(o) != "abstraction" or k in succ_repair: continue
    op = best(o, "op") or ""
    if not re.match(r"(Narrow|Split)", op): continue
    v = int(m.group(2)); prev = m.group(1) if v == 2 else f"{m.group(1)}v{v - 1}"
    cands = by_label.get(prev, [])
    if len(cands) != 1: continue
    p = cands[0]
    outcome = "split" if op.startswith("Split") else "narrow"
    rid = nid("R", 3)
    rp = dict(id=rid, kind="repair", createdAt=RUN_TIME, updatedAt=RUN_TIME, archived=False, targetAbstractionId=ids[p],
              outcome=outcome, antiAdHocReceipt=best(o, "receipt") or "(receipt not recorded)", resultingAbstractionIds=[ids[k]],
              facesFreshSurplus=bool(test_of(o)), tags=[f"run:{objects[p]['label']}"])
    if best(o, "loss"): rp["notes"] = f"Named loss: {best(o, 'loss')}"
    lx, ly = layout.get(p, (0, 0)); rp["layout"] = dict(x=round(lx + 160), y=round(ly + 60))
    repairs.append(rp); repaired_out[p].append((outcome, rid)); succ_repair[k] = rid
    in_edges[k].append((dict(kind="repair", label=op), p))
    add_edge(ids[p], rid, "predecessor"); add_edge(rid, ids[k], "successor")
discarded = {}
for e in EDGES:
    if e["kind"] != "kill": continue
    k = obj_of.get(e["a"]); dn = discard_of.get(e["b"])
    if not k or not dn: continue
    rid = nid("R", 3)
    discarded[k] = rid
    if ftype(objects[k]) == "abstraction":
        rp = dict(id=rid, kind="repair", createdAt=RUN_TIME, updatedAt=RUN_TIME, archived=False, targetAbstractionId=ids[k],
                  outcome="discard", antiAdHocReceipt=dn.get("receipt") or dn.get("op") or dn["text"], resultingAbstractionIds=[],
                  facesFreshSurplus=False, tags=[f"run:{objects[k]['label']}"],
                  notes="\n".join(filter(None, [f"Discard: {dn['text']}", f"Named loss: {dn['loss']}" if dn.get("loss") else ""])))
        lx, ly = layout.get(k, (0, 0)); rp["layout"] = dict(x=round(lx + 160), y=round(ly + 60))
        repairs.append(rp); add_edge(ids[k], rid, "predecessor")
rec["repairs"] = repairs

# tests and implications
def result_of(t):
    v = t["verdict"]
    return {"STANDS": "holds", "BROKEN": "false", "DEMONSTRATED": "holds", "CONTESTED": "insufficient_evidence",
            "FALSE AS STATED": "false"}.get(v, "untested")
def add_test(impl_id, t, k):
    tid = nid("T", 4)
    run = t["run"]; num = t.get("num", 1)
    where = f"Counter-AI {run} #{num} (fresh context, fixed prompt)" if run.startswith("CX") else f"{run} (fresh audit, interim prompt; not the fixed Counter-AI prompt)"
    reply = (t.get("reply") or "").strip()
    excerpt = re.sub(r"\s+", " ", re.sub(r"[#*`>|_]+", " ", reply)).strip()
    excerpt = excerpt[:420].rsplit(" ", 1)[0] + " ..." if len(excerpt) > 420 else excerpt
    note = f"{where}: {t['verdict']}. The verdict belongs to this exact sentence only. {excerpt}"
    lx, ly = layout.get(k, (0, 0)); w, h = bsize.get(k, (220, 108))
    rec["tests"].append(dict(id=tid, kind="test", createdAt=RUN_TIME, updatedAt=RUN_TIME, archived=False, implicationId=impl_id,
                             channel="external", result=result_of(t), evidenceNote=note, testedAt=meta_time(run),
                             notes=f"Full reply of {run} #{num}:\n\n{reply}"[:60000],
                             layout=dict(x=round(lx), y=round(ly - h / 2 - 150)), tags=[f"run:{run}"]))
    add_edge(impl_id, tid, "tested_by")
    return tid

abs_ids = {}
rev_of_diag = {}
for k, o in objects.items():
    if o["kind"] == "revision":
        for n in o["nodes"]:
            rev_of_diag.setdefault(n["diagram"], []).append(k)
for k, o in objects.items():
    if ftype(o) != "abstraction": continue
    a = base(k, "abstraction")
    t = test_of(o); st = status_of(o)
    tier = 2 if o["kind"] == "revision" else 1
    status = "live"
    if st == "ruled": a["tags"].append("ruling:R-S (scripture); untested")
    if t and result_of(t) == "holds": status = "tested_live"
    if k in repaired_out:
        outs = {x for x, _ in repaired_out[k]}
        status = "split" if "split" in outs else "narrowed"; a["archived"] = True
    if k in discarded:
        status = "discarded"; a["archived"] = True
    sg = src_group.get(k) or pass_group[obj_band(k)]
    a.update(statement=o["text"], sourceGroupId=sg, tier=tier, status=status)
    for e, p in in_edges[k]:
        if e["kind"] == "repair" and p in ids and ftype(objects[p]) == "abstraction" and k in succ_repair:
            a["parentId"] = ids[p]; break
    if k in repaired_out and any(x == "split" for x, _ in repaired_out[k]):
        a["childIds"] = [rid_s for x, rid in repaired_out[k] for r in repairs if r["id"] == rid for rid_s in r["resultingAbstractionIds"]]
    rec["abstractions"].append(a); abs_ids[k] = a
    if not src_group.get(k): pass
    add_edge(sg, ids[k], "source_of")
    if t:
        iid = nid("I", 4)
        lx, ly = layout.get(k, (0, 0)); w, h = bsize.get(k, (220, 108))
        impl = dict(id=iid, kind="implication", createdAt=RUN_TIME, updatedAt=RUN_TIME, archived=a["archived"],
                    statement=f"{o['label']} itself, tested word for word. Its exact sentence is on {ids[k]}.",
                    parentAbstractionId=ids[k], surplus=False, status=result_of(t), testIds=[],
                    layout=dict(x=round(lx + w / 2 + 60), y=round(ly)), tags=[f"run:{o['label']}", "direct test"],
                    notes="The sentence itself, tested directly. Not a surplus implication, so it carries no weight toward an invariant.\n\nExact sentence tested:\n" + o["text"])
        rec["implications"].append(impl)
        add_edge(ids[k], iid, "entails")
        for tt in tests_of(o):
            tid = add_test(iid, tt, k); impl["testIds"].append(tid)
        if impl["status"] == "false": add_edge(ids[k], tid, "killed_by")
        if k in discarded:
            for r in repairs:
                if r["id"] == discarded[k]: pass
            a["death"] = dict(killedBy=tid, killType="external", repairsAttempted=[discarded[k]], archivedAt=RUN_TIME)
    elif k in discarded:
        a["death"] = dict(killType="external", repairsAttempted=[discarded[k]], archivedAt=RUN_TIME)

fallback_parent = []
for k, o in objects.items():
    if ftype(o) != "implication": continue
    t = test_of(o); st = status_of(o)
    parent = None
    for e, p in in_edges[k]:
        if p and p in abs_ids and e["kind"] in ("surplus", "flow", "basis"):
            parent = ids[p]; break
    if not parent:
        d = pass_home(o)
        revs = [r for r in rev_of_diag.get(d, []) if r in abs_ids]
        if revs: parent = ids[revs[0]]
    if not parent:
        parent = next(iter(abs_ids.values()))["id"]; fallback_parent.append(o["label"])
    i = base(k, "implication")
    status = result_of(t) if t else "untested"
    if st == "archived": i["archived"] = True
    if re.search(r"invalid derivation", (best(o, "op") or "") + " " + (best(o, "receipt") or ""), re.I):
        status = "invalid_derivation"; i["archived"] = True   # the run's own audit; its verdicts stay attached
    i.update(statement=o["text"], parentAbstractionId=parent, surplus=o["kind"] == "surplus", status=status, testIds=[])
    rec["implications"].append(i)
    add_edge(parent, ids[k], "entails")
    if t:
        for tt in tests_of(o):
            tid = add_test(ids[k], tt, k); i["testIds"].append(tid)

# remaining relations
for e in EDGES:
    a, b = obj_of.get(e["a"]), obj_of.get(e["b"])
    if e["kind"] in ("member", "kill") or not a or not b: continue
    ia, ib = ids.get(a), ids.get(b)
    ta, tb = ftype(objects[a]), ftype(objects[b])
    if e["kind"] == "repair" and re.match(r"(Narrow|Split)", e.get("label", "")) and ta == tb == "abstraction": continue
    if e["kind"] == "flow" and ta == "group" and tb == "abstraction": continue
    if e["kind"] == "surplus" and ta == "abstraction" and tb == "implication": continue
    if e["kind"] == "receipt" and ta == "observation" and b in succ_repair:
        add_edge(ia, succ_repair[b], "supports"); continue
    add_edge(ia, ib, "related")

# ---------- final layout: the schedule ----------
# One band per pass, earliest at the bottom and latest at the top. In each band:
#   floor   - the observations first recorded in that pass, in horizontal rows (groups kept together as blocks);
#   above   - the pass's work as lineages that read upward: a sentence's row is [sentence][pointer][verdicts][repair],
#             and its repaired version sits directly above it; lineages run left to right in the order they were tested;
#   right   - the revisions the pass produced, stacked upward;
#   left    - the pass's heading note.
# Coordinates: u grows upward from the band's base; on the board y = -(u + height) for a plate's top.
by_id = {n["id"]: n for k_ in ("panels", "observations", "groups", "abstractions", "implications", "tests", "repairs") for n in rec[k_]}
def face(n):
    return n.get("title") or n.get("text") or n.get("statement") or n.get("tag") or n.get("evidenceNote") or n.get("antiAdHocReceipt") or ""
direct = defaultdict(list)
for i in rec["implications"]:
    if "direct test" in i.get("tags", []): direct[i["parentAbstractionId"]].append(i["id"])
tests_by = defaultdict(list)
for t in rec["tests"]: tests_by[t["implicationId"]].append(t["id"])
repairs_by = defaultdict(list)
for r_ in rec["repairs"]: repairs_by[r_["targetAbstractionId"]].append(r_["id"])
def row_of(i):
    row = [i]
    for d_ in direct.get(i, []): row += [d_] + tests_by[d_]
    row += tests_by.get(i, [])
    row += repairs_by.get(i, [])
    return row
def sz(i):
    n = by_id[i]; return plate_size(face(n), n["kind"])
placed = set()
def put(i, x, u, base):
    n = by_id[i]; w, h = sz(i)
    top = -(base + u + h)
    n["layout"] = dict(x=round(x + 110), y=round(top + 54))
    if (w, h) != (220, 108): n["boardSize"] = dict(width=w, height=h)
    else: n.pop("boardSize", None)
    placed.add(i)
    if CUR_BAND[0] and f"band:{CUR_BAND[0]}" not in n.setdefault("tags", []): n["tags"].append(f"band:{CUR_BAND[0]}")
    return w, h

band = {k: (obs_band[ids[k]] if objects[k]["kind"] == "observation" else obj_band(k)) for k in objects if k in ids}
statement = lambda k: ftype(objects[k]) in ("abstraction", "implication") and objects[k]["kind"] != "revision"
first_index = {}
for idx, n in enumerate(NODES):
    k = obj_of.get(n["key"])
    if k is not None: first_index.setdefault(k, idx)
def first_run(k):
    nums = [int(t["run"][3:]) if t["run"].startswith("CX") else 0 for t in tests_of(objects[k])]
    return min(nums) if nums else 10 ** 6
kids = defaultdict(list)
for e in EDGES:
    if e["kind"] not in ("repair", "surplus", "flow"): continue
    a_, b_ = obj_of.get(e["a"]), obj_of.get(e["b"])
    if not a_ or not b_ or a_ == b_ or a_ not in ids or b_ not in ids: continue
    if statement(a_) and statement(b_) and band[a_] == band[b_] and b_ not in kids[a_]: kids[a_].append(b_)
for r_ in rec["repairs"]:   # version chains the exporter added
    p_ = next((k for k in ids if ids[k] == r_["targetAbstractionId"]), None)
    for s_id in r_["resultingAbstractionIds"]:
        c_ = next((k for k in ids if ids[k] == s_id), None)
        if p_ and c_ and statement(p_) and statement(c_) and band[p_] == band[c_] and c_ not in kids[p_]: kids[p_].append(c_)

GX, VGAP, SHELF_GAP, BAND_GAP, X0 = 36, 70, 200, 1100, 700
WIDTH = int(os.environ.get("FN_BAND_WIDTH", "16000"))
CUR_BAND = [None]
base_u = 0
for b_ in BAND_ORDER:
    CUR_BAND[0] = b_
    mine = [k for k in ids if band.get(k) == b_]
    # floor: observation blocks
    obs = [k for k in mine if objects[k]["kind"] == "observation"]
    blocks = []
    for gk in sorted(real_groups, key=lambda k: ids[k]):
        mem = [k for k in obs if home_group.get(ids[k]) == gk]
        if mem: blocks.append(sorted(mem, key=lambda k: k[0]))
    rest = sorted([k for k in obs if all(k not in bl for bl in blocks)], key=lambda k: k[0])
    if rest: blocks.append(rest)
    x, u, row_h, floor_right, FLOOR_W = X0, 0, 0, X0, WIDTH
    for bl in blocks:
        cols = min(12 if bl is rest else 4, max(1, len(bl)))
        sizes = [sz(ids[k]) for k in bl]; cw = max(s_[0] for s_ in sizes)
        rows = [bl[i:i + cols] for i in range(0, len(bl), cols)]
        bw = cols * (cw + 40) - 40
        if x > X0 and x + bw > X0 + FLOOR_W: x = X0; u += row_h + 160; row_h = 0
        uu = u
        for r in rows:
            rh = max(sz(ids[k])[1] for k in r)
            for j, k in enumerate(r): put(ids[k], x + j * (cw + 40), uu, base_u)
            uu += rh + 40
        row_h = max(row_h, uu - u); floor_right = max(floor_right, x + bw); x += bw + 160
    floor_top = u + row_h if blocks else 0
    # lineages above the floor
    stm = [k for k in mine if statement(k)]
    child_of, order = {}, []
    roots = sorted([k for k in stm if not any(k in kids[p] for p in stm)], key=lambda k: (first_run(k), first_index.get(k, 0)))
    def claim(k):
        order.append(k)
        for c in kids[k]:
            if c in stm and c not in child_of and c not in roots and c not in order:
                child_of[c] = k; claim(c)
    for r in roots:
        if r not in order: claim(r)
    for k in stm:   # anything in a cycle with no root
        if k not in order: roots.append(k); claim(k)
    tree = defaultdict(list)
    for c, p in child_of.items(): tree[p].append(c)
    def measure(k):
        row = [i for i in row_of(ids[k]) if i not in placed]
        ws = [sz(i) for i in row]
        rw = sum(w for w, _ in ws) + GX * (len(ws) - 1); rh = max(h for _, h in ws)
        subs = [measure(c) for c in tree[k]]
        cw = sum(sw for sw, _ in subs) + 120 * max(0, len(subs) - 1)
        return max(rw, cw), rh + ((VGAP + max(sh for _, sh in subs)) if subs else 0)
    def place(k, x, u):
        row = [i for i in row_of(ids[k]) if i not in placed]
        rx, rh = x, 0
        for i in row:
            w, h = put(i, rx, u, base_u); rx += w + GX; rh = max(rh, h)
        cx = x
        for c in tree[k]:
            cw, _ = measure(c); place(c, cx, u + rh + VGAP); cx += cw + 120
    SHELF_W = max(WIDTH, floor_right - X0)
    x, u, shelf_h, right = X0, floor_top + 260, 0, floor_right
    for r in roots:
        if r in child_of: continue
        w, h = measure(r)
        if x > X0 and x + w > X0 + SHELF_W: x = X0; u += shelf_h + SHELF_GAP; shelf_h = 0
        place(r, x, u); x += w + 160; shelf_h = max(shelf_h, h); right = max(right, x)
    top = u + shelf_h
    # revisions produced in this pass, stacked upward at the right edge
    revs = sorted([k for k in mine if objects[k]["kind"] == "revision"], key=lambda k: int(re.sub(r"\D", "", objects[k]["label"]) or 0))
    rx, ru = right + 300, floor_top + 260
    for k in revs:
        cx, rh = rx, 0
        for i in row_of(ids[k]):
            if i in placed: continue
            w, h = put(i, cx, ru, base_u); cx += w + GX; rh = max(rh, h)
        ru += rh + VGAP
    top = max(top, ru, floor_top)
    # left edge: the heading, then the piece (pass 1), then groups shown as plates
    hu = 0
    def in_this_band(g):
        if g["id"] == pass_group.get(b_): return True
        gk = next((k for k in real_groups if ids[k] == g["id"]), None)
        return gk is not None and group_band.get(gk, "1") == b_
    for i in [heading_of[b_]] + [ids[k] for k in mine if ftype(objects[k]) == "panel"] + \
             [g["id"] for g in rec["groups"] if not any(m in by_id for m in g["memberIds"]) and in_this_band(g)]:
        if i in placed: continue
        w, h = put(i, 0, hu, base_u); hu += h + 60
    for g in rec["groups"]:   # stored fallback point for groups drawn as regions: beside the heading
        if g["id"] not in placed and in_this_band(g):
            g["layout"] = dict(x=110 + 520, y=round(-(base_u + 54))); placed.add(g["id"])
    base_u += max(top, hu) + BAND_GAP
left = [i for i in by_id if i not in placed]
if left: print("not placed by the schedule:", len(left), left[:12])
for j, i in enumerate(left): put(i, -3000 + (j % 4) * 500, (j // 4) * 400, 0)
for k in ("panels", "observations", "groups", "abstractions", "implications", "tests", "repairs"):
    rec[k].sort(key=lambda n: n["id"])
json.dump(rec, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
counts = {k: len(v) for k, v in rec.items() if isinstance(v, list)}
print("wrote", OUT, os.path.getsize(OUT), "bytes", counts)
if fallback_parent: print("implications with a fallback parent:", fallback_parent)
