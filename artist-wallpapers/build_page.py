"""Build the uploader page from the picked finals. Usage: python3 build_page.py FINAL_DIR FOLDER_ID FOLDER_TITLE"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
final, folder_id, folder_title = sys.argv[1], sys.argv[2], sys.argv[3]
meta = json.load(open(os.path.join(HERE, "meta.json")))
order = [a for a in meta]  # meta.json keeps the brief's artist order
items = []
for key in order:
    f = f"{key}_Wallpaper.png"
    assert os.path.exists(os.path.join(final, "full", f)), f
    items.append({"key": key, "name": meta[key][0], "era": meta[key][1], "file": f, "file_url": f"full/{f}", "thumb": f"thumbs/{key}.jpg"})
data = {"folder": {"id": folder_id, "title": folder_title, "url": f"https://drive.google.com/drive/folders/{folder_id}"}, "items": items}
html = open(os.path.join(HERE, "page_template.html")).read().replace("/*DATA*/", json.dumps(data, ensure_ascii=False))
open(os.path.join(final, "index.html"), "w").write(html)
print(len(items), "items")
