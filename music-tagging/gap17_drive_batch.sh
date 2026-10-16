#!/usr/bin/env bash
# Save MCP download tool output files: gap17_drive_batch.sh <drive_id> <agent-tools-txt>
set -euo pipefail
python3 /workspace/music-tagging/gap17_download_save.py "$1" < "$2"
