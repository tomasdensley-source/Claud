#!/usr/bin/env python3
"""Import recent agent-tools Drive download JSON into /tmp/gap17-work/{id}.mp3"""
import base64
import json
from pathlib import Path

TOOLS = Path("/home/ubuntu/.cursor/projects/workspace/agent-tools")
OUT = Path("/tmp/gap17-work")
SLICE_IDS: set[str] | None = None
if Path("/tmp/gap17-tracks.jsonl").exists():
    import json as _json

    SLICE_IDS = {_json.loads(l)["id"] for l in Path("/tmp/gap17-tracks.jsonl").read_text().splitlines()}


def main() -> None:
    n = 0
    for p in sorted(TOOLS.glob("*.txt"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            obj = json.loads(p.read_text())
        except Exception:
            continue
        if obj.get("mimeType") != "audio/mpeg":
            continue
        fid = obj.get("id")
        content = obj.get("content")
        if not fid or not content:
            continue
        if SLICE_IDS is not None and fid not in SLICE_IDS:
            continue
        dest = OUT / f"{fid}.mp3"
        if dest.exists() and dest.stat().st_size > 5000:
            continue
        dest.write_bytes(base64.b64decode(content))
        print("saved", fid, dest.stat().st_size)
        n += 1
    print("imported", n)


if __name__ == "__main__":
    main()
