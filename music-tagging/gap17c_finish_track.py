#!/usr/bin/env python3
"""Finalize one track: resize cover, tag MP3, return paths."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from gap17c_pipeline import cmd_finalize, resize_cover

def main():
    sid, cover_src = sys.argv[1], Path(sys.argv[2])
    meta_path = Path(f"/tmp/gap17-work/meta/{sid}.json")
    meta = json.loads(meta_path.read_text())
    cover_jpg = Path(meta["cover_path"])
    resize_cover(cover_src, cover_jpg)
    tagged = cmd_finalize(sid, cover_src)
    print(json.dumps({"tagged": str(tagged), "cover_jpg": str(cover_jpg)}))

if __name__ == "__main__":
    main()
