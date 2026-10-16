#!/usr/bin/env python3
import json
import sys
from pathlib import Path

meta = json.loads(Path(sys.argv[1]).read_text())
artist = meta["TPE1"].split(";")[0].split(" feat.")[0]
title = meta["TIT2"]
album = meta["TALB"] or "Single"
brief = meta["art_brief"]
print(
    f'Square 1:1 premium album cover illustration, fine-art painted look (visible brushwork, rich color, soft depth—like a vintage prestige record sleeve). No photorealistic pasted text.\n\n'
    f'Typography painted IN the image (same lighting and texture as the scene—not a separate overlay):\n'
    f'- Top: artist name "{artist}" in small caps, elegant and fully readable.\n'
    f'- Lower third: calm uncluttered band for titles.\n'
    f'- Large serif song title: "{title}".\n'
    f'- Smaller italic serif album title directly beneath: "{album}".\n\n'
    f'Scene (full bleed, no text in the middle): {brief}\n\n'
    f'No logos, no label marks, no barcodes, no watermarks, no extra words or signage anywhere.'
)
