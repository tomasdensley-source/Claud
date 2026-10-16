#!/usr/bin/env python3
"""Harvest Drive download JSON from agent-tools into /tmp/gap48-work/{id}.mp3."""
import base64
import json
import re
import sys
from pathlib import Path

TOOLS = Path("/home/ubuntu/.cursor/projects/workspace/agent-tools")
OUT = Path("/tmp/gap48-work")
TARGET = set(sys.argv[1:]) if len(sys.argv) > 1 else None


def parse_obj(raw: str) -> dict | None:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```\s*$", "", raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        if start >= 0:
            try:
                return json.loads(raw[start:])
            except json.JSONDecodeError:
                return None
    return None


saved = 0
for f in sorted(TOOLS.glob("*.txt"), key=lambda p: p.stat().st_mtime, reverse=True):
    try:
        obj = parse_obj(f.read_text())
        if not obj:
            continue
        fid = obj.get("id")
        content = obj.get("content") or obj.get("base64Content")
        if not fid or not content:
            continue
        if TARGET and fid not in TARGET:
            continue
        dest = OUT / f"{fid}.mp3"
        if dest.exists() and dest.stat().st_size > 5000:
            continue
        dest.write_bytes(base64.b64decode(content))
        saved += 1
        print("saved", fid, dest.stat().st_size)
    except Exception:
        continue
print("new", saved)
