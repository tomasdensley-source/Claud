# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is

The tracked product is a single artifact: `obsidian-vault-fixed.zip`, an **Obsidian
vault** bundling three custom, hand-written (already-compiled) JavaScript plugins:

- `file-tree-bulk-actions` – long-press / right-edge multi-select + bulk delete in the file explorer.
- `vault-mobile-signals` – folder icons/colors, graph-group visibility toggles, mobile text/tree scaling.
- `advanced-graph-view` – canvas graph renderer (`dynamic-renderer.js`) + `data.json` config (no `main.js`).

There is **no server, database, build step, or package manager in the product itself**.
The plugins run inside the Obsidian desktop/mobile app. Note the shipped vault has
**no `manifest.json` per plugin, no `community-plugins.json`, and no markdown notes**,
so a stock Obsidian install will not auto-load these plugins from the zip as-is.

### Development harness (added under `dev/`)

Because the product is plain plugin JavaScript, this repo carries a headless harness
that emulates the Obsidian runtime (`dev/obsidian-env.js`) and loads the **real,
unmodified** plugin sources to run and test them. Commands are defined in `package.json`:

- `npm run extract` – unzips the vault into `obsidian-vault-extracted/` (gitignored, disposable).
- `npm run lint` – `node --check` syntax pass over `dev/` and every extracted plugin `.js`.
- `npm test` / `npm run dev` – runs `dev/harness.js` under jsdom, exercising the plugins' core flows with assertions.

Browser (visual) harness, for demos:

```
python3 -m http.server 8123      # serve repo root
# then open http://localhost:8123/dev/browser/index.html
```

### Non-obvious caveats

- `lint`/`test` auto-extract the vault if `obsidian-vault-extracted/` is missing, so
  you normally don't need to run `extract` first. The extracted tree is regenerated
  from the zip — treat it as read-only/disposable; to change plugin code, change the
  source that produces the zip, not the extracted copy.
- The emulated `vault.trash` only updates the in-memory vault; it does **not** re-render
  the DOM (real Obsidian's core file-explorer does). The browser harness (`dev/browser/harness.js`)
  wraps `trash` to remove the row so deletions are visible in the demo.
- In the browser harness, `Notice` toasts auto-dismiss after ~4 seconds.
- jsdom has no real layout, so `getBoundingClientRect()` returns zeros; the harness enters
  the file-tree "selection zone" via a `clientX: 0` pointerdown. Keep this in mind if you
  add tests that depend on element geometry.
