#!/usr/bin/env python3
"""Split base64 MP3 into part files for agent CallDynamicTool assembly."""
from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap19-work")
PARTS = 4


def main() -> None:
    sid = sys.argv[1]
    meta = json.loads((WORK / f"{sid}.json").read_text())
    mp3 = WORK / f"{sid}.tagged.mp3"
    b64 = base64.b64encode(mp3.read_bytes()).decode()
    n = len(b64)
    chunk = (n + PARTS - 1) // PARTS
    out_dir = WORK / "b64parts"
    out_dir.mkdir(exist_ok=True)
    paths = []
    for i in range(PARTS):
        p = out_dir / f"{sid}.part{i}.txt"
        p.write_text(b64[i * chunk : (i + 1) * chunk])
        paths.append(str(p))
    meta_out = {
        "title": meta["filename"],
        "parentId": "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q",
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "b64_len": n,
        "parts": paths,
    }
    print(json.dumps(meta_out))


if __name__ == "__main__":
    main()
