#!/usr/bin/env python3
import sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
im = im.resize((1400, 1400), Image.Resampling.LANCZOS)
im.save(dst, "JPEG", quality=92, optimize=True)
