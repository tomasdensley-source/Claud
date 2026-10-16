#!/bin/bash
# Usage: gap19_process_track.sh <source_id> <cover_png_path> <tagged_drive_id>
set -euo pipefail
SID="$1"
COVER="$2"
TID="${3:-}"
MP3="/tmp/gap19-work/mp3/${SID}.mp3"
python3 /workspace/music-tagging/gap19_batch47.py finalize "$SID" "$MP3" "$COVER" "$TID"
