#!/usr/bin/env python3
"""Resize generated cover artifact to final JPEG path."""
import shutil
import sys
from pathlib import Path

from resize_cover import *  # noqa - use PIL inline
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
im = im.resize((1400, 1400), Image.Resampling.LANCZOS)
Path(dst).parent.mkdir(parents=True, exist_ok=True)
im.save(dst, "JPEG", quality=92, optimize=True)
print(dst)
