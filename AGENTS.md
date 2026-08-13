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

## UI & Theme Conventions (Slate Edge Brutalist)

- **NativeWind Theme & Styling Traps**:
  - **DO NOT use `dark:` variants or dynamic template literals in `className`** (`className={`... ${active ? 'a' : 'b'}`}`) — NativeWind babel plugin fails to extract dynamic classes and `dark:` variants do not update on runtime theme switch.
  - **Always use `useThemeColor()` hook + `style` prop** for all theme colors (`bg`, `surface`, `surfaceElevated`, `ink`, `inkMuted`, `inkFaint`, `border`, `primary`, `good`, `bad`, `primaryInk`, `goodInk`, `badInk`).
  - `useThemeColor()` subscribes to `useSettingsStore((s) => s.theme)` so theme selection in Settings updates all components instantly without relying on system `useColorScheme()`.
  - `className` on `<Ionicons>` does NOT work — pass `color` prop directly.
  - Opacity classes like `bg-primary/10` fail in NativeWind — use `surfaceElevated` token or `style={{ opacity }}`.
  - **Stack Navigator White Flash**: Always set `contentStyle: { backgroundColor: bg }` on `<Stack screenOptions={{ ... }}>` in `_layout.tsx` to prevent default white background flashing during navigation screen transitions in dark mode.
- **i18n**: dictionary in `src/lib/i18n.ts`. Every key must exist in **both** `en` and `id` records. Components use `useT()` hook (subscribes to `useSettingsStore((s) => s.lang)`) for instant language toggle. UI errors are thrown as i18n key strings (`'sync.timeout'`) and translated via `t()`.

## Release (GitHub Actions)

1. Bump version in **both** `package.json` and `app.json` (keep them equal).
2. `git tag vX.Y.Z && git push origin vX.Y.Z` — workflow builds arm64-v8a APK and publishes GitHub Release.

## Cloudflare Worker (`worker/`)

- `cd worker && npm run dev` — local dev
- `cd worker && npm run deploy` — deploy to Cloudflare
- D1 database: `remiscore-d1`. Schema managed in `worker/src/db.ts` (CREATE IF NOT EXISTS).
- First deploy: `cd worker && npx wrangler d1 create remiscore-d1`, copy database_id into `wrangler.jsonc`.
- API: POST `/api/sync` receives full circle snapshot from app.
- Web: `/c/:code` public dashboard, SSR via Hono JSX.

## Google Sheets backup gotchas

- Apps Script lives in `apps-script/Code.gs`, deployed by the user (webhook URL stored in Settings).
- **Every script edit requires a NEW deployment** — old `…/exec` URLs serve a stale version or an HTML error page. Error text from that HTML page is extracted by `src/lib/sheetSync.ts` and surfaced as `sync.scriptError:<message>`.
- Backup format: 6 table tabs + hidden raw JSON tab (`RemiScoreBackup`) used for import. Do not change tab names without updating `apps-script/Code.gs`.
