# RemiScore — Expo SDK 57

> Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Commands (order: lint -> typecheck -> test)

- `npm run lint` — expo lint (ESLint flat config)
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — `node --test src/lib/*.test.ts` (node:test, runs in plain Node v24)
- `npm run android` / `npm start` — Expo dev server

## Path alias & test traps

- `@/x` → `./src/x`, `@/assets/*` → `./assets/*` (tsconfig `paths`).
- **node:test does NOT resolve `@/` and cannot load `expo-sqlite` (native).** Tests import relative paths with `.ts` extension (`./score.ts`). A file under test must be pure (no `@/` imports, no expo-sqlite). Precedent: DB IO lives in `backup.ts`, pure logic split into `backupCore.ts` so it is testable.

## Data & state

- SQLite via `expo-sqlite`. Migrations = array in `src/db/database.ts`, versioned by `PRAGMA user_version`. Add a new table/column by **appending** to `MIGRATIONS`, never editing existing entries.
- All DB access through `src/db/*Repo` (circleRepo, playerRepo, sessionRepo, leaderboardRepo).
- Zustand stores in `src/store/`, persisted to `expo-sqlite/kv-store`. **Persist rehydrates async** — do not initialize component state from a store value on first render; read the store directly (see `SheetSyncSection`).

## UI conventions

- NativeWind/Tailwind v3. Dark mode via `dark:` variants. Custom colors in `tailwind.config.js`: `accent` (#0071e3), `good`, `bad`, `surface*`, `ink*`. `accent-dark` has only `soft` (no DEFAULT).
- i18n: dictionary in `src/lib/i18n.ts`. Every key must exist in **both** `en` and `id` records. UI errors are thrown as i18n key strings (`'sync.timeout'`) and translated via `t()`.

## Release (GitHub Actions)

1. Bump version in **both** `package.json` and `app.json` (keep them equal).
2. `git tag vX.Y.Z && git push origin vX.Y.Z` — workflow builds arm64-v8a APK and publishes GitHub Release.

## Google Sheets backup gotchas

- Apps Script lives in `apps-script/Code.gs`, deployed by the user (webhook URL stored in Settings).
- **Every script edit requires a NEW deployment** — old `…/exec` URLs serve a stale version or an HTML error page. Error text from that HTML page is extracted by `src/lib/sheetSync.ts` and surfaced as `sync.scriptError:<message>`.
- Backup format: 6 table tabs + hidden raw JSON tab (`RemiScoreBackup`) used for import. Do not change tab names without updating `apps-script/Code.gs`.
