#!/usr/bin/env python3
"""Prepare draft metadata for gap15 slice."""
import json
import re
import time
from pathlib import Path

from gap15_pipeline import analyze_audio, mb_search, parse_filename, pick_mb_recording

GAP = Path("/tmp/drive-inventory/gap-15-17.jsonl")
OUT = Path("/tmp/gap15-work/metadata_draft.jsonl")
LINES = range(127, 190)


def main():
    lines = GAP.read_text(encoding="utf-8").splitlines()
    tracks = [json.loads(lines[i - 1]) for i in LINES]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        for t in tracks:
            parsed = parse_filename(t["title"])
            audio = {}
            mp3 = Path(f"/tmp/gap15-work/{t['id']}.mp3")
            if mp3.exists():
                audio = analyze_audio(mp3)
            q = f'recording:"{parsed["parsed_title"]}" AND artist:"{parsed["uploader"].split(",")[0][:40]}"'
            recs = mb_search(q)
            if not recs:
                q2 = f'recording:"{parsed["parsed_title"]}"'
                recs = mb_search(q2)
            mb = pick_mb_recording(recs, audio.get("tlen_ms", 0), parsed["parsed_title"])
            entry = {
                "id": t["id"],
                "filename": t["title"],
                "fileSize": t["fileSize"],
                **parsed,
                "audio": audio,
                "mb": mb,
            }
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            time.sleep(1.05)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
