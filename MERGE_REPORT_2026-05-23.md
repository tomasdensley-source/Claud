# Merge report — 2026-05-23

Two vaults were concatenated into one, keeping the best attributes of each.

## Inputs

- `✦ My Vault ✦` — the mature personal vault (chassis). Full `.obsidian` (~50 plugins, snippets 90→97, Minimal theme, `folder-colors.css`), Veritas Quo numeric-prefix org, dashboard `README`, `CHANGELOG`.
- `✧ Graphy ✧` — a bundle containing the `Individuation` Obsidian-plugin vault (the **Graphy** plugin + theme + canonical `.graphy/` state + `Graphy_Goal_Index.md`) plus dev/design material (`ai-context/`, `plugin-source/`, `dev-fixtures/`, `build-evidence/`, `LiberNovus-Densley/`, reports).

## Output

A single vault, `✦ My Vault ✦`, = the chassis with Graphy folded in.

## Decisions (Evidence → Choice)

1. **Chassis = My Vault.** It has the strictly richer `.obsidian` (the Graphy/Individuation `.obsidian` was minimal — 4 plugins, no snippets). Best org + config attribute lives here, so it is the base.
2. **Graphy plugin + theme added, not rebuilt.** `.obsidian/plugins/graphy/` (v0.4.22) and `.obsidian/themes/Graphy/` (v0.4.21, all assets) copied verbatim. `graphy` added as the first entry of `community-plugins.json`. The plugin's `main.js` is the deployed minified blob; `plugin-source/` here is historical v0.3.53 and must **not** be used to rebuild (would regress v0.4 work — see `ai-context/HANDOFF_2026-05-16_post-rev36.md` §5).
3. **Theme installed but not activated.** Minimal stays the default (`appearance.json` unchanged) because the chassis is primarily a working/editing vault. Switch to the Graphy theme for the full gamified Goal-Index visuals.
4. **Canonical state preserved byte-for-byte.** `.graphy/` (state.json, seed/, fixtures/, audit.log, backups/) copied to vault root, where the plugin expects it (`.graphy/state.json`, `.graphy/seed/…`, `.graphy/attachments`). Per `BUNDLE_PROTOCOL.md` safety rule, nothing in `.graphy/` was edited; markdown remains a projection.
5. **Goal Index + linked notes at root.** `Graphy_Goal_Index.md` kept at root (its `graphy_role: goal_index` frontmatter + the README's "only the Goal Index is visible at root" design). The two notes it wikilinks — `Outreach_Cadence.md`, `Quote_Conversion_Loop.md` — were kept at root so the links resolve.
6. **`.vault-content/` kept hidden at root.** Its only cross-references are internal, so moving it as a unit preserves consistency; keeping it hidden matches the Graphy design and avoids cluttering the visible numeric-prefix org.
7. **Dev/design bundle → `0A_graphy-plugin/`.** All non-runtime Graphy material grouped under one new typed folder, named to My Vault's convention (sits beside `0_graphy-build/`, the *Android-app* project). `LiberNovus-Densley/` is included here because the post-rev-36 handoff classified it as design-source ("the engine and map"), the same kind of reference material as `ai-context/`.
8. **Deduplication, best-version-wins.** `obsidian-style-settings`, `sanctum-pinch-zoom`, `sanctum-heading-fold` exist in both vaults; My Vault's are newer/larger and were kept. The Graphy bundle's older duplicates were not copied. Only `graphy` (plugin) and `Graphy` (theme) were genuinely new.

## Not done (honest reporting)

- No plugin logic rebuilt; no state migrated (still schema 1.1).
- Body-sync hash and version strings inherited as-is — not regenerated, not faked.
- The two `0_…` folders are deliberately distinct: `0_graphy-build/` = the future **Android app**; `0A_graphy-plugin/` = the existing **Obsidian plugin**. They were not merged into each other.

## Open question for Thomas (one)

`LiberNovus-Densley/` (the Red Book / Descent journaling) is filed under `0A_graphy-plugin/` as design-source. If you'd rather treat it as personal *content* (its own visible folder, e.g. `1_individuation/`), say so and it moves.
