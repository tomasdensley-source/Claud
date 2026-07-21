# Fieldnote (Web)

Calm, touch-first infinite canvas — Konva + React 19 + Zustand + IndexedDB.

## Run

```bash
cd fieldnote-web
npm install
npm run dev
```

Open the local URL on your phone (same Wi‑Fi) or deploy the `dist/` folder to any static host.

## Build / test

```bash
npm run build
npm run test
npm run preview
```

## What you get

- Infinite pan/zoom Konva canvas with semantic zoom, viewport culling, and pan inertia
- Floating snap toolbar (Add / Files / Multi / Draw / Find / More)
- Unified vertical color palette (objects + draw)
- Floating UI placement engine (overlap avoidance; object toolbar protects connector dots)
- Hold-to-edit text (~500 ms + haptic)
- Mind maps: collapse, child/sibling, tidy, subtree move, depth simplify, Scientific method (19 nodes)
- Task water-flow dependencies with glowing connectors + cycle guard
- Draw tool (pen / highlighter / eraser) with unified palette
- PDF import with covers (pdf.js), 250 MB guard, cancelable jobs, fullscreen reader
- Markdown sectioned editor + audio player
- Working files peek/half/full + blob-backed media that survives refresh
- Package export/import with embedded blobs
- Multi-tab write lock + unsaved beforeunload
- Region pattern / opacity / lock + background-edit mode
- Device-local persistence (IndexedDB + localStorage)
- Gesture priority: 2+ fingers always navigate

Boards are stored **on the device** in the browser — no account required.
