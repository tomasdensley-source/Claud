# Fieldnote — Infinite Canvas (Expo)

A faithful Expo / React Native recreation of
[Fieldnote](https://infinite-canvas-board.glitzypixie.chatgpt.site): a private,
device-local infinite workspace for text, images, files, folders, tasks, mind
maps, regions, and freehand drawings.

Built for **Android** (Expo Go + installable APK via EAS).

## Features

- Infinite pan / pinch-zoom canvas with warm cream dot grid
- Seed demo board matching Fieldnote (“A place for unfinished ideas…”)
- Floating walnut toolbar: Add, Boards, Files, Multi, Draw, Find, More
- Add panel: device files / photos, text, task, mind map, region
- Multiple boards with local autosave (AsyncStorage)
- Working files panel, search, undo/redo, gestures guide, storage controls
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
  components/              Canvas, toolbar, minimap, panels
eas.json                   EAS Build profiles (preview → APK)
```

## Show up in your Expo projects list (EAS)

The Expo “Select project” screen only lists apps that have been **created on
expo.dev** and built with **EAS**. This repo alone is not enough.

From your machine (logged into the Expo account that owns Red Book / pinkbook):

```bash
cd fieldnote
npm install
npx eas-cli login                 # or: export EXPO_TOKEN=...
npx eas-cli init --force         # creates the Fieldnote project on expo.dev
npx eas-cli build -p android --profile preview --non-interactive
```

When the build finishes, **Fieldnote** appears on your Expo recent/projects
page with “Android build completed,” same as your other apps. The build page
also gives a direct APK install link.

## Run with Expo Go (dev server)

```bash
cd fieldnote
npm install
npx expo start
```

Open **Expo Go** → scan the QR code (or use the development server entry).
This is a live Metro session; it will not permanently add a project card until
you run the EAS steps above.

## Download an installable APK (GitHub CI)

Every push/PR runs `.github/workflows/fieldnote-build.yml`, which type-checks,
runs smoke tests, and builds a debug Android APK via `expo prebuild` + Gradle.

1. Open the repo **Actions** tab → latest **Fieldnote Build** run  
2. Download the **`fieldnote-android-apk`** artifact (`fieldnote-debug.apk`)  
3. Install on Android (allow unknown sources if prompted)

## Scripts

```bash
npm start          # Expo dev server
npm run typecheck  # tsc --noEmit
npm test           # seed smoke tests
```
