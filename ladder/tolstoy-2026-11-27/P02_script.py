"""P2: mechanical isolation of assumptions from P01_reply.txt. No model judgment."""
import re, sys
src = open(sys.argv[1], encoding="utf-8").read()
claims = re.findall(r"^(S-\d{3})\nCLAIM: (.*)\nANCHOR: (.*)$", src, re.M)
assum = re.findall(r"^(S-\d{3}\.[ab]): (.*)$", src, re.M)
mode = sys.argv[2]
if mode == "claims":
    print("# P01 claims (from P01_reply.txt, mechanically laid out)\n")
    for cid, c, a in claims:
        print(f"## {cid}\n- Claim: {c}\n- Anchor: {a}")
        for aid, t in assum:
            if aid.startswith(cid + "."): print(f"- {aid}: {t}")
        print()
elif mode == "assumptions":
    print("# P02 assumptions, isolated mechanically by P02_script.py\n")
    for aid, t in assum: print(f"{aid}\t{t}")
elif mode == "tally":
    ids = [c[0] for c in claims]; aids = [a[0] for a in assum]
    expect = [f"{c}.{x}" for c in ids for x in "ab"]
    print("claims:", len(ids), ids); print("assumptions:", len(aids), aids)
    print("assumptions == 2 x claims:", len(aids) == 2 * len(ids)); print("assumption IDs match expected a/b per claim:", aids == expect)
