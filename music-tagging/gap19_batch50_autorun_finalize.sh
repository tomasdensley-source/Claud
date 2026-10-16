#!/bin/bash
# Finalize batch-50 tracks when cover JPGs land in artifacts/assets.
set -euo pipefail
cd /workspace/music-tagging
while true; do
  python3 gap19_batch50_finalize_pending.py || true
  sleep 20
done
