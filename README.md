# RemiScore 🃏

Pencatatan skor Remi digital untuk geng tongkrongan. Gantiin notebook yang gampang hilang dengan aplikasi offline-first: bikin geng, atur pemain, catat skor tiap ronde, dan pantau klasemen musim secara real-time.

## Fitur

- **Circle / geng** — bikin & kelola banyak geng (misal "Warkop Malam Minggu", "Basecamp Remi"), plus riwayat sesi lengkap dengan tanggal & ranking final.
- **Player & sesi** — 2–7 pemain per sesi, registrasi pemain cepat per geng.
- **Input skor cepat** — input per ronde dengan stepper (±5/±25) + input manual, validasi otomatis kelipatan 5, total & ranking langsung ter-update real-time.
- **AFK / Absen** — Pemain yang absen dicatat dengan skor `null` agar statistik `Ronde Main` dan `Poin/Ronde` tidak terdistorsi. Status AFK otomatis bertahan ke ronde selanjutnya sampai tombol "Ikut Main" diklik.
- **Edit & Hapus Ronde** — Bisa edit skor ronde sebelumnya atau hapus ronde. Skor kumulatif untuk ronde setelahnya akan otomatis dihitung ulang.
- **Klasemen Sepuh (Leaderboard)** — Urutan klasemen presisi menggunakan tie-breaker:
  1. Jumlah kemenangan sesi terbanyak (DESC)
  2. Total poin minus paling sedikit (ASC)
  3. Sesi dimainkan paling sedikit (ASC)
- **Detail Profil Pemain Lengkap** — Profil pemain di aplikasi menampilkan statistik lengkap: total poin, poin/sesi, poin/ronde, ronde main (aktif), ronde tergacor (peak), ronde ter-apes (worst), sesi main, kemenangan, serta riwayat track record sesi dengan nomor urut sequential.
- **Dashboard Web Live (Cloudflare Worker)** — Sinkronkan geng menggunakan kode share ke Cloudflare D1. Teman-teman bisa memantau jalannya pertandingan secara real-time langsung dari browser.
- **Tema & bahasa** — mode System/Light/Dark + bahasa Indonesia/English (copy khas tongkrongan 😄).

## Tech stack

| Layer | Pilihan |
|---|---|
| Framework | Expo SDK 57 (React Native, TypeScript) |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind (Tailwind untuk React Native) |
| State | Zustand (dengan persist ke expo-sqlite kv-store) |
| Database | expo-sqlite (schema versioned migration) |
| Web Sync | Cloudflare Workers & Cloudflare D1 Database |
| Icons | @expo/vector-icons (Ionicons) |

## Struktur proyek

```
src/
├── app/                       # Expo Router screens
│   ├── _layout.tsx            # Stack + sistem tema
│   ├── index.tsx              # Home: daftar geng
│   ├── settings.tsx           # Setelan tema, bahasa, dan Cloud Worker
│   ├── circle/[id].tsx        # Detail geng: pemain, klasemen musim, riwayat
│   ├── circle/[id]/player/[playerId].tsx # Profil lengkap pemain di tingkat circle
│   ├── session/[id].tsx       # Sesi live: ranking real-time, riwayat ronde
│   ├── session/[id]/add-round.tsx        # Modal input skor ronde + status AFK
│   ├── session/[id]/edit-round.tsx       # Layar edit skor ronde sebelumnya
│   └── session/[id]/player/[playerId].tsx # Detail riwayat per pemain per ronde di sesi tersebut
├── db/                        # Lapisan data (SQLite)
│   ├── database.ts            # open + migrasi ber-version (nullable score_change & legacy AFK data fix)
│   ├── circleRepo / playerRepo / sessionRepo / leaderboardRepo
├── store/
│   ├── sessionStore.ts        # Zustand: total & ranking live, load fallback, cloudSync
│   └── settingsStore.ts       # Persist tema, bahasa, URL Worker
├── lib/
│   ├── score.ts               # logika murni: validasi ±5, kumulatif, ranking, tie-breaker
│   ├── format.ts              # format timestamp & tanggal (Intl)
│   ├── backupCore.ts          # serialize/parse backup (pure, ter-test)
│   ├── backup.ts              # export/import semua tabel ke SQLite
│   ├── cloudSync.ts           # Client-side sync engine dengan conflict-resolution (merge local-remote)
│   └── i18n.ts                # EN/ID dictionary
└── components/                # PlayerCard, StepperRow, EmptyState, CloudSyncSection
worker/                        # Web Dashboard & Backend Sync
├── src/
│   ├── index.tsx              # Hono application (API sync & HTML pages router)
│   ├── db.ts                  # D1 database setup & migrations (nullable score_change & legacy AFK data fix)
│   └── pages/                 # UI neobrutalism untuk share dashboard, circle, player, & session
```

## Menjalankan

```bash
npm install
npm run start        # Expo dev server
npm run android      # jalankan di emulator / perangkat (Expo Go)
```

Script lain:

```bash
npm test             # node:test untuk logika skor & round-trip backup
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint (ESLint)
```

## Aturan skor

- Tiap ronde: satu skor per pemain (kelipatan 5, boleh negatif, rentang −1000…1000).
- Sesuai skema `scores`, total kumulatif dihitung transaksional per ronde (kolom `cumulative_total`).
- Pemenang sesi = total tertinggi saat sesi diakhiri. Seri di puncak = sama-sama menang.
- Klasemen musim menghitung: total poin, sesi dimainkan, dan jumlah menang per pemain.

## Skema database

```sql
circles (id, name, created_at)
players (id, name, circle_id → circles, created_at)
sessions (id, circle_id → circles, label, status active|completed, created_at, completed_at)
rounds   (id, session_id → sessions, round_number, timestamp, UNIQUE(session_id, round_number))
scores   (id, round_id → rounds, player_id → players, score_change, cumulative_total)
```

Semua operasi data lewat `src/db/*Repo` — ganti implementasi repo ke Firebase/Supabase nanti tanpa menyentuh UI.

## Build APK

APK rilis 64-bit (arm64-v8a) dibuild otomatis oleh GitHub Actions — lihat [.github/workflows/release.yml](.github/workflows/release.yml).

1. Tag release: `git tag v1.0.0 && git push origin v1.0.0`
2. Workflow build `assembleRelease` dan rilis APK ke **GitHub Releases**.

Build manual:

```bash
npx expo prebuild -p android
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

## Lisensi

MIT
