#!/usr/bin/env python3
"""Save MP3s from Google-drive download JSON files (agent-tools or gap15-work/dl)."""
import base64
import json
import sys
from pathlib import Path

AGENT = Path("/home/ubuntu/.cursor/projects/workspace/agent-tools")
OUT = Path("/tmp/gap15-work")


def save_obj(obj: dict) -> Path | None:
    fid = obj.get("id")
    content = obj.get("content") or obj.get("base64Content")
    if not fid or not content:
        return None
    out = OUT / f"{fid}.mp3"
    out.write_bytes(base64.b64decode(content))
    return out


def save_file(path: Path) -> Path | None:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
        start = text.find("{")
        obj = json.loads(text[start:])
        return save_obj(obj)
    except Exception as e:
        print("fail", path, e)
        return None


def main():
    paths = [Path(p) for p in sys.argv[1:]] if len(sys.argv) > 1 else sorted(AGENT.glob("*.txt"))
    n = 0
    for p in paths:
        if save_file(p):
            n += 1
            print("saved", p.name)
    print("total saved", n)


if __name__ == "__main__":
    main()
