#!/usr/bin/env python3
"""Harvest recent agent-tools Drive downloads into /tmp/gap19-work/{id}.mp3 for batch55."""
import base64
import json
from pathlib import Path

TOOLS = Path("/home/ubuntu/.cursor/projects/workspace/agent-tools")
OUT = Path("/tmp/gap19-work")
NEED = json.loads(Path("/tmp/gap19-batch55-missing.json").read_text())
need_ids = {t["id"] for t in NEED}


def main() -> None:
    n = 0
    for p in sorted(TOOLS.glob("*.txt"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
            if "audio/mpeg" not in text and '"content"' not in text:
                continue
            obj = json.loads(text)
            fid = obj.get("id")
            if fid not in need_ids:
                continue
            content = obj.get("content") or obj.get("base64Content")
            if not content:
                continue
            dest = OUT / f"{fid}.mp3"
            if dest.exists() and dest.stat().st_size > 5000:
                continue
            dest.write_bytes(base64.b64decode(content))
            print("saved", fid, dest.stat().st_size)
            n += 1
        except Exception as e:
            continue
    print("new", n)


if __name__ == "__main__":
    main()
