#!/usr/bin/env python3
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent))
from gap15_utils import cover_prompt, load_slice, done_ids

cat = json.loads(Path("/tmp/gap15-work/track_catalog.json").read_text())
for t in load_slice(190, 251):
    if t["id"] in done_ids():
        continue
    c = cat[t["id"]]
    print(json.dumps({
        "id": t["id"],
        "filename_png": f"/tmp/gap15-work/cover-{t['id']}.png",
        "filename_jpg": f"/workspace/music-tagging/covers/gap15/{t['id']}.jpg",
        "prompt": cover_prompt(
            c.get("cover_artist", c["TPE1"].upper()),
            c["TIT2"],
            c.get("TALB", ""),
            c["art_brief"],
        ),
    }))
