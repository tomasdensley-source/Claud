"""Build the Fieldnote-layout board page around a LadderRecord v1 file.

Usage: python3 -I tools/build_board.py RECORD.json OUT.html "Tree name"
The page embeds the record, draws it the way the Fieldnote app draws its board, and can save it
back out as a Fieldnote import file or take more Fieldnote files in (as new Trees or added onto this one).
"""
import json, os, sys
rec_path, out, name = sys.argv[1], sys.argv[2], sys.argv[3]
rec = json.load(open(rec_path, encoding="utf-8"))
tpl = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fieldnote_board_template.html"), encoding="utf-8").read()
blob = json.dumps(rec, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
html = tpl.replace("/*__RECORD__*/", blob).replace("/*__TREE__*/", json.dumps(name, ensure_ascii=False).replace("</", "<\\/"))
open(out, "w", encoding="utf-8").write(html)
print("wrote", out, os.path.getsize(out), "bytes")
