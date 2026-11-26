import re, sys
src = open(sys.argv[1], encoding="utf-8").read()
items = re.findall(r"^- (S-\d{3}\.[ab]): (.+)$", src, flags=re.M)
claims = re.findall(r"^### (S-\d{3})$", src, flags=re.M)
with open(sys.argv[2], "w", encoding="utf-8") as out:
    out.write("# P02 Assumptions isolated (mechanical, by P02_script.py)\n\n")
    for i, t in items:
        out.write(f"{i}\t{t}\n")
print(f"claims={len(claims)} assumptions={len(items)} expected={2*len(claims)} ok={len(items)==2*len(claims)}")
expected = [f"{c}.{x}" for c in claims for x in "ab"]
print("id_list_match:", [i for i,_ in items] == expected)
