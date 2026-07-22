# Fieldnote — Infinite Canvas (Expo)

A faithful Expo / React Native recreation of
[Fieldnote](https://infinite-canvas-board.glitzypixie.chatgpt.site): a private,
device-local infinite workspace for text, images, files, folders, tasks, mind
maps, regions, and freehand drawings.

Built for **Android** (Expo Go + installable APK).

## Features

- Infinite pan / pinch-zoom canvas with warm cream dot grid
- Seed demo board matching Fieldnote (“A place for unfinished ideas…”)
- Floating walnut toolbar: Add, Boards, Files, Multi, Draw, Find, More
- Add panel: device files / photos, text, task, mind map, region
- Multiple boards with local autosave (AsyncStorage)
- Working files panel, search, undo/redo, gestures guide, storage controls
- Import/export boards as JSON Canvas 1.0 (lossless round-trip), plus a
  one-tap Repair Map for AI-generated boards with broken coordinates
- Vertical color palette (default closed): frame vs. body toggle, 8 presets,
  5 persistent custom slots (hold a slot to save the last color used)
- Minimap + zoom controls + Fit board
- Long-press cards to edit; hold empty canvas to open Add

## Project layout

```
App.tsx
src/
  theme.ts                 Fieldnote color tokens
  types.ts
  store/BoardContext.tsx   Boards, selection, history, persistence
  lib/seed.ts              Demo board content
  lib/storage.ts           AsyncStorage
  lib/camera.ts            Zoom/pan clamp + coordinate math
  lib/jsoncanvas.ts        JSON Canvas 1.0 import/export
  lib/normalize.ts         Coordinate repair for broken/AI-generated boards
  components/Palette.tsx  Vertical color palette (frame/body, custom slots)
  components/              Canvas, toolbar, minimap, panels
eas.json                   EAS Build profiles (preview → APK)
```

## Run with Expo Go (Android)

```bash
cd fieldnote
npm install
npx expo start
```

Install **Expo Go** on your Android phone, then scan the QR code.

## Download an installable APK (CI)

Every push/PR runs `.github/workflows/fieldnote-build.yml`, which type-checks,
runs smoke tests, and builds a debug Android APK via `expo prebuild` + Gradle.

1. Open the repo **Actions** tab → latest **Fieldnote Build** run  
2. Download the **`fieldnote-android-apk`** artifact (`fieldnote-debug.apk`)  
3. Install on Android (allow unknown sources if prompted)

## EAS Build (optional)

```bash
cd fieldnote
npx eas-cli build -p android --profile preview
```

`preview` produces an installable APK. `production` targets an AAB.

## Scripts

```bash
npm start          # Expo dev server
npm run typecheck  # tsc --noEmit
npm test           # seed smoke tests
```
