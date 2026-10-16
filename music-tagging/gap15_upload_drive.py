#!/usr/bin/env python3
"""Upload tagged MP3 via create_file payload file (for manual MCP or API)."""
import json
import sys
from pathlib import Path

# Reads .upload.json and writes trimmed payload for ids under size limit
MAX = 8_000_000  # chars b64 ~6MB mp3

def main(source_id: str):
    p = Path(f"/tmp/gap15-work/{source_id}.upload.json")
    if not p.exists():
        raise SystemExit("run gap15_finish_one.py prep first")
    data = json.loads(p.read_text())
    b64 = data["base64Content"]
    if len(b64) > MAX:
        print("WARN large", len(b64))
    out = Path(f"/tmp/gap15-work/{source_id}.create_args.json")
    out.write_text(json.dumps(data))
    print(out, "size", out.stat().st_size)


if __name__ == "__main__":
    main(sys.argv[1])
