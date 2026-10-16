#!/usr/bin/env python3
"""Build track catalog from MB lookups + curated overrides."""
import json
import re
from pathlib import Path

OVERRIDES = {
    "1Gm2M2ygMoss06bFO7APVsNOvk0VxdETt": {
        "TIT2": "Video Killed the Radio Star",
        "TPE1": "The Buggles",
        "TALB": "The Age of Plastic",
        "TPE2": "The Buggles",
        "TDRC": "1979-09-07",
        "TDOR": "1979-09-07",
        "TCON": "New wave / Pop",
        "family": "Pop",
        "subgenre": "New wave",
        "TCOM": "Geoff Downes; Trevor Horn; Bruce Woolley",
        "TPUB": "Island Records",
        "has_vocals": "yes",
        "lyrics_selected": "yes",
        "lyrics_reason": "iconic MTV-era new wave hit",
        "lyrics_source": "https://lrclib.net/api/search?q=Video+Killed+the+Radio+Star+The+Buggles",
        "MOOD": "nostalgic; synthetic; playful",
        "art_brief": "Retro-futurist TV studio at dusk: a vintage cathode-ray television dissolving into neon broadcast waves, teal and magenta glow (album: plastic age chrome; artist nod: a lone synthesizer keyboard).",
        "cover_artist": "THE BUGGLES",
        "sources": "MusicBrainz; Wikipedia \"Video Killed the Radio Star\"; filename",
    },
    "1vMjp2IfFRcHJNI6INbVxNzdTEJGWe2LK": {
        "TIT2": "Should I Stay or Should I Go",
        "TPE1": "The Clash",
        "TALB": "Combat Rock",
        "TPE2": "The Clash",
        "TDRC": "1982-05-21",
        "TDOR": "1982-05-21",
        "TCON": "Punk rock / Rock",
        "family": "Rock",
        "subgenre": "Punk rock",
        "TCOM": "Mick Jones",
        "TPUB": "CBS",
        "has_vocals": "yes",
        "lyrics_selected": "yes",
        "lyrics_reason": "signature Clash singalong",
        "lyrics_source": "https://lrclib.net/api/search?q=Should+I+Stay+or+Should+I+Go+The+Clash",
        "MOOD": "restless; driving; defiant",
        "art_brief": "Gritty London alley split by red and green door light, cracked brick and torn gig poster texture (album: combat grit; artist nod: crossed guitar straps).",
        "cover_artist": "THE CLASH",
        "sources": "MusicBrainz; Wikipedia \"Should I Stay or Should I Go\"; filename",
    },
}

# Load MB and apply heuristics - full catalog in separate JSON file
if __name__ == "__main__":
    mb = json.loads(Path("/tmp/gap15-work/mb-lookups.json").read_text())
    print(len(mb), "tracks", len(OVERRIDES), "overrides")
