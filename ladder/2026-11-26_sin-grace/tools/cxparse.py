import re
STRICT = r"^\W*(\d+)\.\s*\**\s*(BROKEN|STANDS)\b"
HEAD = r"^\W*(\d+)\.\s+\S"
def parse(reply, n):
    """Return {i: (verdict or None, segment)} for i in 1..n."""
    out = {}
    if n == 1:
        words = set(re.findall(r"\b(BROKEN|STANDS)\b", reply))
        return {1: (words.pop() if len(words) == 1 else None, reply.strip())}
    strict = list(re.finditer(STRICT, reply, flags=re.M))
    for j, m in enumerate(strict):
        i = int(m.group(1))
        if i in out or i > n: continue
        end = strict[j+1].start() if j+1 < len(strict) else len(reply)
        out[i] = (m.group(2), reply[m.start():end].strip())
    heads = [(int(m.group(1)), m.start()) for m in re.finditer(HEAD, reply, flags=re.M)]
    for i in range(1, n+1):
        if i in out: continue
        starts = [p for k, p in heads if k == i]
        if not starts: out[i] = (None, ""); continue
        s = starts[0]; nxt = [p for k, p in heads if k == i+1 and p > s]
        e = nxt[0] if nxt else len(reply)
        seg = reply[s:e]; words = set(re.findall(r"\b(BROKEN|STANDS)\b", seg))
        out[i] = (words.pop() if len(words) == 1 else None, seg.strip())
    return out
