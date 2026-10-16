#!/usr/bin/env python3
"""Analyze all downloaded MP3s for gap17 slice 1-74."""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from gap17_batch39 import (
    WORK,
    build_row,
    load_done_ids,
    load_tracks,
    musicbrainz_lookup,
    parse_filename,
    analyze_audio,
)

def main():
    WORK.mkdir(parents=True, exist_ok=True)
    done = load_done_ids()
    for t in load_tracks():
        sid = t["id"]
        if sid in done:
            continue
        mp3 = WORK / f"{sid}.mp3"
        if not mp3.exists():
            continue
        meta = WORK / f"{sid}.json"
        if meta.exists():
            continue
        parsed = parse_filename(t["title"])
        parsed["filename"] = t["title"]
        audio = analyze_audio(mp3)
        mb = musicbrainz_lookup(parsed["artist_hint"], parsed["title_hint"])
        row = build_row(t["title"], sid, "", parsed, audio, mb)
        meta.write_text(json.dumps(row, indent=2))
        print("ok", sid, row["TIT2"][:50], flush=True)
        time.sleep(1.1)


if __name__ == "__main__":
    main()
