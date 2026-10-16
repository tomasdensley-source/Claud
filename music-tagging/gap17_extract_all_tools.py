#!/usr/bin/env python3
"""Extract MP3s from agent-tools Drive download JSON outputs."""
import base64
import json
from pathlib import Path

WORK = Path("/tmp/gap17-work")
TOOLS = Path("/home/ubuntu/.cursor/projects/workspace/agent-tools")
seen: set[str] = set()


def try_extract(path: Path) -> str | None:
    try:
        obj = json.loads(path.read_text())
    except Exception:
        return None
    if not isinstance(obj, dict) or "content" not in obj:
        return None
    fid = obj.get("id")
    if not fid or fid in seen:
        if (WORK / f"{fid}.mp3").exists():
            return None
    content = obj["content"]
    out = WORK / f"{fid}.mp3"
    if out.exists() and out.stat().st_size > 1000:
        seen.add(fid)
        return None
    out.write_bytes(base64.b64decode(content))
    seen.add(fid)
    return fid


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    n = 0
    for p in sorted(TOOLS.glob("*.txt"), key=lambda x: x.stat().st_mtime):
        r = try_extract(p)
        if r:
            print("extracted", r)
            n += 1
    print("new", n)


if __name__ == "__main__":
    main()
