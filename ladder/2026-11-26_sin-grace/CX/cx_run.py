import json, subprocess, sys, datetime, difflib
run, stmts_file, model = sys.argv[1], sys.argv[2], sys.argv[3]
ref = open("CX/FIXED_PROMPT_reference.txt", encoding="utf-8").read()
PH = "[INSERT THE STATEMENTS HERE, NUMBERED, EXACTLY AS PHRASED]"
assert ref.count(PH) == 1
rows = [l.rstrip("\n").split("\t", 1) for l in open(stmts_file, encoding="utf-8") if l.strip()]
block = "\n".join(f"{n}. {s}" for n, (_, s) in enumerate(rows, 1))
prompt = ref.replace(PH, block)
open(f"CX/{run}_prompt.txt", "w", encoding="utf-8").write(prompt)
# integrity: pasted text with statement block removed vs reference with placeholder line removed
a = prompt.replace(block, "").splitlines(); b = ref.replace(PH, "").splitlines()
diff = "\n".join(difflib.unified_diff(b, a, lineterm=""))
payload = {"model": model, "messages": [{"role": "user", "content": prompt}]}
json.dump(payload, open(f"CX/{run}_payload.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
r = subprocess.run(["curl", "-s", "https://openrouter.ai/api/v1/chat/completions", "-H", "Authorization: Bearer proxy-injected",
    "-H", "Content-Type: application/json", "--data-binary", f"@CX/{run}_payload.json"], capture_output=True, text=True)
open(f"CX/{run}_response.json", "w", encoding="utf-8").write(r.stdout)
d = json.loads(r.stdout); reply = d["choices"][0]["message"]["content"]
open(f"CX/{run}_reply.txt", "w", encoding="utf-8").write(reply)
nm = "\n".join(f"| {n} | {i} | {s} |" for n, (i, s) in enumerate(rows, 1))
open(f"CX/{run}_meta.md", "w", encoding="utf-8").write(f"""# {run} meta
Time UTC: {datetime.datetime.now(datetime.timezone.utc).isoformat()}
Platform: OpenRouter chat completions. Model requested: {model}; reported: {d.get('model')}; id: {d.get('id')}
Freshness (5.3.1(b)): one request, messages array holds one user message, no system message. Payload: {run}_payload.json. No further turn sent.
Integrity diff (must be empty): {'EMPTY' if not diff else 'NON-EMPTY'}
{diff}
## Number map
| # | Object | Exact sentence |
|---|---|---|
{nm}
""")
print(run, d.get("model"), "diff:", "EMPTY" if not diff else diff)
