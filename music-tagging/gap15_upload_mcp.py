#!/usr/bin/env python3
"""Upload one tagged MP3 via Google-drive MCP create_file (reads .upload.json)."""
import json
import sys
import urllib.request
from pathlib import Path

# Invoked by agent: outputs create_file args path; agent calls CallDynamicTool separately.
# This script validates payload size.


def main(source_id: str) -> None:
    p = Path(f"/tmp/gap15-work/{source_id}.upload.json")
    data = json.loads(p.read_text())
    required = {"title", "parentId", "contentMimeType", "base64Content"}
    missing = required - set(data)
    if missing:
        raise SystemExit(f"missing keys {missing}")
    print(json.dumps({k: data[k] for k in sorted(data) if k != "base64Content"}, indent=2))
    print("base64_len", len(data["base64Content"]))


if __name__ == "__main__":
    main(sys.argv[1])
