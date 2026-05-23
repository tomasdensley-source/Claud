# Claud

## Unified_Vault_2026-05-23 (split zip)

One Obsidian vault built by pooling every source provided, deduping by content,
and organizing into convergent categories — with the Graphy plugin + ~44-plugin
config as a separate technical layer.

**~15,236 markdown notes, 39 categories, 1.3 GB unzipped.**

Pass 2 (2026-05-23) folded in a new source batch: **839 compound banners** (resolving
771 previously-dangling pharmacopoeia embeds), the incoming **Pharmacopoeia** vault,
a self-contained **`72_Security_Credentials`** "Sanctum" compartment, and
**`16_Personal_NSFW/Sissy_Training/`** — with 1,126 exact duplicates removed.

Pass 3 (2026-05-23) — curation: collapsed 358 pharmacopoeia near-duplicates
(duplicate basenames **450 → 31**), consolidated the Security compartment (removed
39 scattered copies), repaired 30 mojibake filenames, auto-fixed 111 broken links, and
created 66 structural link targets (Universal Codex source, MOC indexes, film-facet
indexes, system guides) cutting dangling links **14,641 → 10,203**. The judgment-heavy
remainder (missing-content links, inbox) is queued in review notes.
Pass 3c then promoted 22 pharmacopoeia variants to canonical, created 64 concept
notes (−584 dangling), and routed 383 inbox notes by filename (inbox 2,303 → 1,904).
See `CURATION_REPORT_2026-05-23.md` (+ `CURATION_PASS3_2026-05-23.tsv`).

### Download & reassemble

GitHub caps single files at 100 MB, so the 833 MB zip is split into 9 parts
(`part00`–`part08`). Reassemble in order:

```
cat Unified_Vault_2026-05-23.zip.part* > Unified_Vault_2026-05-23.zip
unzip Unified_Vault_2026-05-23.zip      # → open the "✦ My Vault ✦" folder in Obsidian
```

### What's inside / how it was built
- `INTEGRATION_REPORT_2026-05-23.md` — method, provenance, convergent categories, and an honest disclosure of sensitive content (incl. the Pass-2 section).
- `DEDUP_REPORT_2026-05-23.md` — the exact duplicates removed and what was kept; Pass-2 removals detailed in `DEDUP_PASS2_2026-05-23.tsv`.
- `NORTH_STAR_100.md` — the 100 characteristics the vault aims toward (acceptance criteria).
- `CURATION_REPORT_2026-05-23.md` — the pass-3 cleanup method, North Star delta, and open review queues; per-change log in `CURATION_PASS3_2026-05-23.tsv`.

> ⚠️ Per request, sensitive content is included as-is. The `72_Security_Credentials`
> compartment ships as an empty scaffold (no live secrets were present in the upload);
> API-key / GPG template files, NSFW, and financial/medical categories remain as-is.
> See the disclosure in the integration report; rotate any real keys.

Supersedes the earlier `Merged_Vault` (Graphy-merge-only) artifact and the Pass-1 two-part bundle.
