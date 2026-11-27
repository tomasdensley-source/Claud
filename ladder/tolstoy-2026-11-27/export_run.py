"""Export this run as a Fieldnote LadderRecord v1 (bare record). Adapted from the skill's tools/export_fieldnote.py
for this run's layout (fieldnote-record.md: 'a run with another record layout adapts it'). Reads only run artifacts."""
import json, re, math, sys
R = "."
OUT = sys.argv[1]
def meta_time(p):
    t = re.search(r"Started \(UTC\): (\S+)", open(p).read()).group(1)
    m = re.match(r"(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.(\d+))?", t)
    return f"{m.group(1)}T{m.group(2)}.{(m.group(3) or '0').ljust(3,'0')[:3]}Z"
T0 = meta_time("P01_meta.md"); T4 = meta_time("P04_meta.md"); T6 = meta_time("P06_meta.md"); T7 = meta_time("P07_meta.md")
piece = open("P00_source.md").read().split("\n\n")[1].strip()
claims = re.findall(r"^## (S-\d{3})\n- Claim: (.*)\n- Anchor: (.*)$", open("P01_claims.md").read(), re.M)
assum = re.findall(r"^(S-\d{3}\.[ab])\t(.*)$", open("P02_assumptions.md").read(), re.M)
gen = dict(re.findall(r"^(S-\d{3}\.[ab])\t(.*)$", open("P03_reply.txt").read(), re.M))
p4raw = open("P04_reply.txt").read()
audit = {i: (c, g.strip()) for i, c, g in re.findall(r"^(S-\d{3}\.[ab])\t([A-Z ]+?)\t(.*)$", p4raw, re.M)}
gate = dict(re.findall(r"^(S-\d{3})\t(YES|NO)\t", open("P06_reply.txt").read(), re.M))
path = dict(re.findall(r"^(S-\d{3})\nPATH TYPE: (.*)$", open("P07_reply.txt").read(), re.M))
checks = open("P06_corpus_checks.txt").read()
rec = dict(version=1, panels=[], observations=[], groups=[], abstractions=[], implications=[], tests=[],
           convergences=[], invariants=[], repairs=[], edges=[])
def edge(a, b, k, t=T0): rec["edges"].append(dict(id=f"E-{len(rec['edges'])+1:05d}", fromId=a, toId=b, kind=k, createdAt=t))
def size(text, w=360):
    lines = sum(max(1, math.ceil(len(par) / (w / 8.2))) for par in text.split("\n"))
    h = min(1000, max(108, 70 + lines * 22)); return None if (w == 220 and h == 108) else dict(width=w, height=h)
def base(i, kind, x, y, text, tags, t=T0, w=360):
    b = dict(id=i, kind=kind, createdAt=t, updatedAt=t, archived=False, layout=dict(x=x, y=y), tags=tags + ["band:1", "pass:1"])
    s = size(text, w)
    if s: b["boardSize"] = s
    return b
# panels: heading (left edge) and the piece
hd = "Pass 1 (Nov 27, 2026): the piece, its claims and assumptions, the fresh audit, the gate and the paths"
hdd = ("Two claims, four assumptions. Gate: 2 YES, 0 NO. Paths: 2 NO PATH FOUND. With no NOs, Steps 0 to 8 had no input: "
       "no candidate abstraction, no Counter-AI run. Every stage rests on interim prompts (OPEN O-01).")
p = base("P-0001", "panel", -560, 0, hd + "\n" + hdd, ["heading"], w=460); p.update(panelType="regular", title=hd, detail=hdd, voice="note", history=[])
rec["panels"].append(p)
p = base("P-0002", "panel", -560, -1000, piece, ["run:P00"], w=460)
p.update(panelType="regular", title="The piece (P00), verbatim", detail=piece + "\n\nThe opening line of Tolstoy's Anna Karenina (Garnett translation). Not the author's writing.", voice="note", history=[])
p["boardSize"] = dict(width=460, height=200); rec["panels"].append(p)
# observations: mechanical corpus checks (floor)
obs = [("O-0001", "The corpus file C1 contains the wording 'All happy families are alike; each unhappy family is unhappy in its own way.' 30 times, 19 of them on a line that also names Tolstoy.", "P06_corpus_checks.txt (grep -F -c on C1)"),
       ("O-0002", "The piece's own wording, 'Happy families are all alike; every unhappy family is unhappy in its own way.', occurs 0 times in corpus file C1.", "P06_corpus_checks.txt (grep -F -c on C1)")]
rec["groups"].append(dict(id="G-001", kind="group", createdAt=T0, updatedAt=T0, archived=False, tag="Pass 1: observations first recorded",
    basis="topical", memberIds=[o[0] for o in obs], tier=0, layout=dict(x=110, y=0), tags=["band:1", "pass:1"],
    notes="The observations first recorded in this pass. It is also the source group of the pass's claims and assumptions. A boundary for the pass, not evidence."))
for n, (i, t, src) in enumerate(obs):
    o = base(i, "observation", 110 + n * 420, 0, t, [], t=T6)
    o.update(text=t, affectCharge="neutral", groupIds=["G-001"], provenance=dict(source=src, firstEncounter="Ladder run tolstoy-2026-11-27, P06_corpus_checks.txt", recordedAt=T6))
    rec["observations"].append(o); edge(i, "G-001", "member_of", T6)
# abstractions: claims (top shelf) and assumptions (rows)
aid, iid, tid = [100], [0], [0]
def nxt(c, pre, w): c[0] += 1; return f"{pre}-{str(c[0]).zfill(w)}"
claim_id = {}
for n, (cid, c, anchor) in enumerate(claims):
    a_id = nxt(aid, "A", 3); claim_id[cid] = a_id
    note = f"Claim {cid} (P01, AUX-1 x-ai/grok-4.7, fresh request). Anchor: {anchor}\nGate (P06, interim prompt): {gate[cid]}, resting on excerpt [1], a quotation list (OPEN O-05).\nPath (P07, interim prompt): {path[cid]}. What follows is OPEN (O-06).\nThe gate and the path type are workflow findings, not truth values; no test of this sentence was run."
    a = base(a_id, "abstraction", 110 + n * 1300, -1000, c + "\n" + note, [f"run:{cid}", "claim", f"gate:{gate[cid]}", f"path:{path[cid]}"])
    a.update(statement=c, sourceGroupId="G-001", tier=1, status="live", notes=note); rec["abstractions"].append(a); edge("G-001", a_id, "source_of")
RES = {"DEMONSTRATED": "holds", "CONTESTED": "insufficient_evidence", "FALSE AS STATED": "false"}
for n, (sid, t) in enumerate(assum):
    cid = sid[:5]; col = 0 if sid.endswith(".a") else 1
    x = 110 + (int(cid[-1]) - 1) * 1300; y = -260 - col * 340
    x = x if True else x
    a_id = nxt(aid, "A", 3)
    gnote = f"Assumption {sid} of claim {cid} (P01). Generalized form (P03): {gen[sid]} (string-identical: {gen[sid]==t})."
    a = base(a_id, "abstraction", x, y, t + "\n" + gnote, [f"run:{sid}", "assumption"])
    a.update(statement=t, sourceGroupId="G-001", tier=1, status="live", notes=gnote); rec["abstractions"].append(a)
    edge("G-001", a_id, "source_of"); edge(claim_id[cid], a_id, "related")
    i_id = nxt(iid, "I", 4); cat, ground = audit[sid]; res = RES[cat]
    im = base(i_id, "implication", x + 420, y, "x", [f"run:{sid}", "direct test"], w=220)
    im.update(statement=f"{sid} itself, audited word for word. Its exact sentence is on {a_id}.", parentAbstractionId=a_id, surplus=False, status=res, testIds=[],
              notes="The sentence itself, audited directly. Not a surplus implication, so it carries no weight toward an invariant.\n\nExact sentence audited:\n" + gen[sid])
    im.pop("boardSize", None); rec["implications"].append(im); edge(a_id, i_id, "entails")
    t_id = nxt(tid, "T", 4)
    ev = f"P04 (fresh audit, interim prompt; not the fixed Counter-AI prompt): {cat}. The verdict belongs to this exact sentence only. {ground}"
    te = base(t_id, "test", x + 840, y, ev, ["run:P04"], t=T4)
    te.update(implicationId=i_id, channel="external", result=res, evidenceNote=ev, testedAt=T4, notes="Full reply of P04 (deepseek/deepseek-v4-pro-0813, fresh request):\n\n" + p4raw)
    rec["tests"].append(te); im["testIds"].append(t_id); edge(i_id, t_id, "tested_by", T4)
    if res == "false": edge(i_id, t_id, "killed_by", T4)
for o in obs: 
    for cid in claim_id.values(): edge(o[0], cid, "related", T6)
json.dump(rec, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("wrote", OUT, {k: len(v) for k, v in rec.items() if isinstance(v, list)})
