#!/usr/bin/env python3
"""Write ID3 tags and APIC cover to MP3."""
import sys
from pathlib import Path

from mutagen.id3 import APIC, COMM, TALB, TCOM, TCON, TDRC, TIT2, TKEY, TLEN, TPE1, TPE2, TBPM, TPUB, TXXX, ID3
from mutagen.mp3 import MP3


def write_tags(mp3_path: str, cover_jpg: str, meta: dict):
    audio = MP3(mp3_path, ID3=ID3)
    if audio.tags is None:
        audio.add_tags()

    def set_frame(frame_cls, key, val):
        if val:
            audio.tags.delall(frame_cls.__name__)
            audio.tags.add(frame_cls(encoding=3, text=str(val)))

    set_frame(TIT2, "TIT2", meta.get("TIT2"))
    set_frame(TPE1, "TPE1", meta.get("TPE1"))
    set_frame(TALB, "TALB", meta.get("TALB"))
    set_frame(TDRC, "TDRC", meta.get("TDRC"))
    set_frame(TCON, "TCON", meta.get("TCON"))
    set_frame(TLEN, "TLEN", meta.get("TLEN"))
    set_frame(TPE2, "TPE2", meta.get("TPE2"))
    set_frame(TCOM, "TCOM", meta.get("TCOM"))
    set_frame(TBPM, "TBPM", meta.get("TBPM"))
    set_frame(TKEY, "TKEY", meta.get("TKEY"))
    set_frame(TPUB, "TPUB", meta.get("TPUB"))

    comm = meta.get("COMM")
    if comm:
        audio.tags.delall("COMM")
        audio.tags.add(COMM(encoding=3, lang="eng", desc="", text=comm))

    mood = meta.get("MOOD")
    if mood:
        for t in audio.tags.getall("TXXX:MOOD"):
            audio.tags.delall("TXXX:MOOD")
        audio.tags.add(TXXX(encoding=3, desc="MOOD", text=mood))

    ytid = meta.get("youtube_id")
    if ytid:
        audio.tags.delall("TXXX:purl")
        audio.tags.add(
            TXXX(encoding=3, desc="purl", text=f"https://www.youtube.com/watch?v={ytid}")
        )

    cover = Path(cover_jpg)
    if cover.exists():
        data = cover.read_bytes()
        audio.tags.delall("APIC")
        audio.tags.add(
            APIC(
                encoding=3,
                mime="image/jpeg",
                type=3,
                desc="Cover",
                data=data,
            )
        )

    audio.save(v2_version=3)


if __name__ == "__main__":
    import json

    mp3, cover, meta_json = sys.argv[1], sys.argv[2], sys.argv[3]
    write_tags(mp3, cover, json.loads(meta_json))
