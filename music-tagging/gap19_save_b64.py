#!/usr/bin/env python3
"""Save MP3 from Drive download_file_content JSON (stdin or file)."""
import base64
import json
import sys
from pathlib import Path

def main():
    if len(sys.argv) > 1 and sys.argv[1] != "-":
        raw = Path(sys.argv[1]).read_text()
    else:
        raw = sys.stdin.read()
    obj = json.loads(raw)
    fid = obj.get("id") or (sys.argv[2] if len(sys.argv) > 2 else "unknown")
    content = obj.get("content") or obj.get("base64Content")
    if not content:
        raise SystemExit("no content in JSON")
    out = Path(f"/tmp/gap19-work/{fid}.mp3")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(base64.b64decode(content))
    print(out, out.stat().st_size)

if __name__ == "__main__":
    main()
