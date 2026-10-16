#!/usr/bin/env python3
"""Parse agent-tools download JSON and save to gap19 mp3 dir."""
import base64
import json
import re
import sys
from pathlib import Path

OUT = Path("/tmp/gap19-work/mp3")


def parse_file(p: Path) -> None:
    raw = p.read_text()
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    raw = re.sub(r"\s*```\s*$", "", raw)
    obj = json.loads(raw)
    fid = obj.get("id")
    b64 = obj.get("content") or obj.get("base64Content")
    if not fid or not b64:
        return
    dest = OUT / f"{fid}.mp3"
    if dest.exists() and dest.stat().st_size > 5000:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(base64.b64decode(b64))
    print("saved", fid, dest.stat().st_size)


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        parse_file(Path(arg))
