#!/usr/bin/env python3
import base64
import json
import sys

data = sys.stdin.read()
try:
    obj = json.loads(data)
    if isinstance(obj, dict):
        for key in ("base64Content", "content", "data", "fileContent"):
            if key in obj and obj[key]:
                data = obj[key]
                break
        else:
            # might be nested
            data = obj.get("result", obj)
            if isinstance(data, dict):
                for key in ("base64Content", "content", "data"):
                    if key in data:
                        data = data[key]
                        break
except json.JSONDecodeError:
    pass
out = sys.argv[1]
with open(out, "wb") as f:
    f.write(base64.b64decode(data))
print(out, "bytes", open(out, "stat").st_size if False else 0)
