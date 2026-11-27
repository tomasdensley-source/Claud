# Precedence log (A3)
No conflict encountered between the skill file and the Ladder in this run.
One divergence from the reference exporter (not from the Ladder or the skill file) is logged: the reference tools/export_fieldnote.py sets an abstraction to tested_live when its latest verdict is an audit DEMONSTRATED ("holds"). The skill file §10.1 allows TESTED-LIVE only after Step 3, and fieldnote-record.md §4 ties tested_live to STANDS. This run's exporter (export_run.py) therefore keeps audit-only objects live.
