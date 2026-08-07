# RemiScore 🃏

Pencatatan skor Remi digital untuk geng tongkrongan. Gantiin notebook yang gampang hilang dengan aplikasi offline-first: bikin geng, atur pemain, catat skor tiap ronde, dan pantau klasemen musim secara real-time.

## Fitur

- **Circle / geng** — bikin & kelola banyak geng (misal "Warkop Malam Minggu", "Basecamp Remi"), plus riwayat sesi lengkap dengan tanggal & ranking final.
- **Player & sesi** — 2–7 pemain per sesi, registrasi pemain cepat per geng.
- **Input skor cepat** — input per ronde dengan stepper (±5/±25) + input manual, validasi otomatis kelipatan 5, total & ranking langsung ter-update real-time.
- **Riwayat per player** — tap pemain di sesi untuk lihat detail tiap ronde (delta, kumulatif, timestamp).
- **Klasemen musim** — agregasi lintas sesi: total poin, jumlah sesi, jumlah menang. Rank 1–3 pakai ikon gold/silver/bronze.
- **Timestamps** — tiap ronde otomatis tercatat dengan timestamp lengkap.
- **Offline-first** — data lokal di SQLite, arsitektur repository yang siap migrasi ke backend (Firebase/Supabase).
- **Tema & bahasa** — mode System/Light/Dark + bahasa Indonesia/English (copy khas tongkrongan 😄).

## Tech stack

| Layer | Pilihan |
|---|---|
| Framework | Expo SDK 57 (React Native, TypeScript) |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind (Tailwind untuk React Native) |
| State | Zustand (dengan persist ke expo-sqlite kv-store) |
| Database | expo-sqlite (schema versioned migration) |
| Icons | @expo/vector-icons (Ionicons) |

## Struktur proyek

```
src/
├── app/                       # Expo Router screens
│   ├── _layout.tsx            # Stack + sistem tema
│   ├── index.tsx              # Home: daftar geng
│   ├── settings.tsx           # Setelan tema + bahasa
│   ├── circle/[id].tsx        # Detail geng: pemain, klasemen musim, riwayat
│   ├── session/[id].tsx       # Sesi live: ranking real-time
│   ├── session/[id]/add-round.tsx        # Modal input skor ronde
│   └── session/[id]/player/[playerId].tsx # Detail riwayat per pemain
├── db/                        # Lapisan data (SQLite)
│   ├── database.ts            # open + migrasi ber-version
│   ├── circleRepo / playerRepo / sessionRepo / leaderboardRepo
├── store/
│   ├── sessionStore.ts        # Zustand: total & ranking live
│   └── settingsStore.ts       # Persist tema + bahasa
├── lib/
│   ├── score.ts               # logika murni: validasi ±5, kumulatif, ranking
│   ├── format.ts              # format timestamp (Intl)
│   └── i18n.ts                # EN/ID dictionary
└── components/                # PlayerCard, StepperRow, EmptyState
```

## Menjalankan

```bash
npm install
npm run start        # Expo dev server
npm run android      # jalankan di emulator / perangkat (Expo Go)
```

Script lain:

```bash
npm test             # node:test untuk logika skor (validasi ±5, ranking, kumulatif)
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
