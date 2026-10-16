#!/usr/bin/env python3
"""Analyze MP3: duration, bitrate, BPM, key."""
import sys
import numpy as np

def analyze(path: str) -> dict:
    from mutagen.mp3 import MP3
    import librosa

    audio = MP3(path)
    duration_ms = int(audio.info.length * 1000)
    bitrate = int(audio.info.bitrate / 1000) if audio.info.bitrate else 0

    y, sr = librosa.load(path, duration=90, mono=True)
    if len(y) < sr:
        y_full, _ = librosa.load(path, mono=True)
        y = y_full

    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    bpm = float(tempo) if np.ndim(tempo) == 0 else float(tempo[0])

    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)
    key_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    best_corr, best_key = -1, ""
    for i in range(12):
        maj = np.corrcoef(chroma_mean, np.roll(major_profile, i))[0, 1]
        min_ = np.corrcoef(chroma_mean, np.roll(minor_profile, i))[0, 1]
        if maj > best_corr:
            best_corr, best_key = maj, key_names[i]
        if min_ > best_corr:
            best_corr, best_key = min_, key_names[i] + "m"

    bpm_note = ""
    bpm_conf = "Med"
    plausible = bpm
    if bpm > 160:
        half = bpm / 2
        if 60 <= half <= 140:
            bpm_note = f"BPM halved from librosa {int(round(bpm))} (double-time detection)."
            plausible = half
            bpm_conf = "Med"
    elif bpm < 70:
        double = bpm * 2
        if 80 <= double <= 180:
            bpm_note = f"BPM doubled from librosa {int(round(bpm))}."
            plausible = double
            bpm_conf = "Low"

    key_conf = "Med" if best_corr >= 0.55 else ("Low" if best_corr >= 0.45 else "")
    tkey = best_key if key_conf else ""

    return {
        "TLEN": duration_ms,
        "bitrate_kbps": bitrate,
        "TBPM_raw": int(round(bpm)),
        "TBPM": int(round(plausible)),
        "TBPM_conf": bpm_conf if plausible else "",
        "bpm_note": bpm_note,
        "TKEY": tkey,
        "TKEY_conf": key_conf if tkey else "",
        "key_corr": float(best_corr),
    }


if __name__ == "__main__":
    print(analyze(sys.argv[1]))
