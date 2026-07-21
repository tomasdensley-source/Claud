# Fieldnote (Web)

Calm, touch-first infinite canvas — Konva + React 19 + Zustand + IndexedDB.

## Run

```bash
cd fieldnote-web
npm install
npm run dev
```

Open the local URL on your phone (same Wi‑Fi) or deploy the `dist/` folder to any static host.

## Build

```bash
npm run build
npm run preview
```

## What you get

- Infinite pan/zoom Konva canvas with semantic zoom + viewport culling
- Floating snap toolbar (Add / Files / Multi / Draw / Find / More)
- Unified vertical color palette
- Floating UI placement engine (overlap avoidance)
- Hold-to-edit text (~500 ms + haptic)
- Mind maps (incl. Scientific method template)
- Task water-flow dependencies with glowing connectors
- Draw tool (pen / highlighter / eraser)
- Working files + search + export package
- Device-local persistence (IndexedDB + localStorage)
- Gesture priority: 2+ fingers always navigate

Boards are stored **on the device** in the browser — no account required.
