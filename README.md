# Go — the ancient board game

A fully functional, native mobile implementation of **Go** (圍棋 / 囲碁 / 바둑),
built with **Expo + React Native (TypeScript)** and configured for builds with
**EAS** (Expo Application Services).

Two players share one device and take turns. The full rules of Go are
implemented in a tested, UI-agnostic engine.

## Features

- **Real rule engine** (`src/game/GoGame.ts`)
  - Group / liberty detection (flood fill)
  - Capturing groups with zero liberties
  - **Suicide** prohibition
  - **Ko / positional superko** (no repeated whole-board position)
  - Passing — two consecutive passes end the game
  - **Area (Chinese) scoring** with komi, including territory detection
  - Full **undo** history
- Board sizes **9×9, 13×13, 19×19** with correct star points (hoshi)
- Crisp SVG board and stones with shadows, highlights, and a last-move marker
- Live capture counts, live score estimate, and a final result card
- Works on iOS, Android, and web (Expo)
- Unit tests for the engine (`src/game/GoGame.test.ts`)

## Project layout

```
App.tsx                  App shell, state wiring, controls
index.ts                 Expo entry point
src/game/GoGame.ts       Rules engine (no UI dependencies)
src/game/GoGame.test.ts  Engine unit tests (node:test)
src/components/GoBoard.tsx  SVG board + tap handling
src/theme.ts             Colors
app.json                 Expo app config
eas.json                 EAS Build profiles
```

## Running locally

```bash
npm install
npm start          # then press i (iOS), a (Android), or w (web)
```

To run on a device, install **Expo Go** and scan the QR code, or use a
development build.

## Tests

```bash
npm test
```

Compiles the engine and runs the unit tests with Node's built-in test runner.

## Building with EAS

This project is configured for EAS Build. Profiles live in `eas.json`:
`development`, `preview` (internal APK / simulator build), and `production`.

```bash
npm install -g eas-cli      # if you don't have it
eas login                   # log into your Expo account
eas build:configure         # links the project (creates the EAS project id)

# Internal test builds
eas build --profile preview --platform android
eas build --profile preview --platform ios

# Production / store builds
eas build --profile production --platform all

# Submit to the stores
eas submit --profile production --platform android
eas submit --profile production --platform ios
```

> Note: `eas build` runs on Expo's cloud servers and requires an Expo account
> and network access. Update the `bundleIdentifier` (iOS) and `package`
> (Android) in `app.json` to your own reverse-domain identifiers before
> publishing.

## How to play

- Black and White alternate placing stones on empty intersections; Black first.
- A connected group with no empty adjacent points (liberties) is captured.
- Suicide and recreating a previous whole-board position (ko) are illegal.
- Two passes end the game. Area scoring counts your stones plus the empty
  points you fully surround; White adds the komi bonus (default 6.5).
