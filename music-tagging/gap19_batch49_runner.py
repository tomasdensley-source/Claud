#!/usr/bin/env python3
"""Batch 49 runner: prep upload JSON, finalize row after tagged_drive_id."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import gap19_batch49 as b49
from gap19_upload_one import WORK, PARENT  # noqa: F401

UPLOAD = WORK / "upload"


def upload_json_for(sid: str) -> Path:
    import base64

    tagged = WORK / "tagged" / f"{sid}.mp3"
    if not tagged.exists():
        tagged = WORK / f"{sid}.tagged.mp3"
    meta = json.loads((WORK / f"{sid}.json").read_text())
    payload = {
        "title": meta["filename"],
        "parentId": "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q",
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
    }
    UPLOAD.mkdir(parents=True, exist_ok=True)
    out = UPLOAD / f"{sid}.json"
    out.write_text(json.dumps(payload))
    return out


def try_api_upload(sid: str) -> str | None:
    script = Path(__file__).with_name("gap19_drive_api_upload.py")
    try:
        raw = subprocess.check_output(
            [sys.executable, str(script), sid], text=True, timeout=600
        )
        data = json.loads(raw)
        return data.get("id")
    except subprocess.CalledProcessError as e:
        print("api upload failed", sid, (e.output or "")[:500], file=sys.stderr)
    except Exception as e:
        print("api upload error", sid, e, file=sys.stderr)
    return None


def try_shell_upload(sid: str) -> str | None:
    tid = try_api_upload(sid)
    if tid:
        return tid
    up = upload_json_for(sid)
    script = Path(__file__).with_name("gap19_drive_upload_call.py")
    try:
        raw = subprocess.check_output(
            [sys.executable, str(script), str(up)], text=True, timeout=600
        )
        data = json.loads(raw)
        return data.get("id") or data.get("fileId")
    except subprocess.CalledProcessError as e:
        print("upload failed", sid, e.output[:500] if e.output else e, file=sys.stderr)
    except Exception as e:
        print("upload error", sid, e, file=sys.stderr)
    return None


def finalize(sid: str, tagged_id: str) -> None:
    meta = json.loads((WORK / f"{sid}.json").read_text())
    meta["tagged_drive_id"] = tagged_id
    b49.append_csv({k: v for k, v in meta.items() if not k.startswith("_")})


def cmd_upload_one(sid: str) -> None:
    tid = try_shell_upload(sid)
    if tid:
        finalize(sid, tid)
        print(json.dumps({"ok": True, "tagged_drive_id": tid}))
    else:
        up = upload_json_for(sid)
        print(json.dumps({"ok": False, "upload_json": str(up)}))


if __name__ == "__main__":
    if sys.argv[1] == "upload-one":
        cmd_upload_one(sys.argv[2])
    elif sys.argv[1] == "upload-json":
        print(upload_json_for(sys.argv[2]))
