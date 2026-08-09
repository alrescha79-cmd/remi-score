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
- **Backup Google Sheets** — export & import semua data (geng, pemain, sesi, skor) ke spreadsheet via Apps Script webhook. Tanpa OAuth di app.
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
│   ├── settings.tsx           # Setelan tema, bahasa, backup Google Sheets
│   ├── circle/[id].tsx        # Detail geng: pemain, klasemen musim, riwayat
│   ├── session/[id].tsx       # Sesi live: ranking real-time
│   ├── session/[id]/add-round.tsx        # Modal input skor ronde
│   └── session/[id]/player/[playerId].tsx # Detail riwayat per pemain
├── db/                        # Lapisan data (SQLite)
│   ├── database.ts            # open + migrasi ber-version
│   ├── circleRepo / playerRepo / sessionRepo / leaderboardRepo
├── store/
│   ├── sessionStore.ts        # Zustand: total & ranking live
│   └── settingsStore.ts       # Persist tema, bahasa, URL webhook sheets
├── lib/
│   ├── score.ts               # logika murni: validasi ±5, kumulatif, ranking
│   ├── format.ts              # format timestamp (Intl)
│   ├── backupCore.ts          # serialize/parse backup (pure, ter-test)
│   ├── backup.ts              # export/import semua tabel ke SQLite
│   ├── sheetSync.ts           # HTTP client ke webhook Apps Script
│   └── i18n.ts                # EN/ID dictionary
└── components/                # PlayerCard, StepperRow, EmptyState, SheetSyncSection
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

## Backup Google Sheets (Apps Script)

Backup butuh satu kali setup: buat Google Apps Script, tempel kode di bawah, deploy sebagai **Web App** dengan akses **Anyone**, lalu tempel URL `…/exec` di **Settings → Google Sheets backup**.

1. Buka [script.google.com](https://script.google.com) → **New project**.
2. Salin isi [`apps-script/Code.gs`](apps-script/Code.gs) dan tempel ke editor. **Tidak perlu edit apa pun** — script otomatis memakai spreadsheet aktif/atau membuat `RemiScoreBackup` di Drive. (Opsional: mau paksa spreadsheet tertentu, isi `OVERRIDE_SPREADSHEET_ID` dengan ID-nya.)

3. **Deploy → New deployment → Web app**:
   - **Execute as**: *Me*
   - **Who has access**: *Anyone*
4. Saat muncul peringatan **"Google hasn't verified this app"** — normal, karena script belum diverifikasi Google. Karena ini script punyamu sendiri, aman lewati: klik **Advanced → Go to [nama project] (unsafe) → Allow**. Ini cukup sekali saja.
5. **Test script dulu langsung dari editor** (sebelum nyobain di app):
   - Pilih fungsi `test` di dropdown (gantikan `myFunction`), klik **Run** → izinkan authorization.
   - Buka **View → Logs**. Kalau keluar:
     ```
     POST -> {"ok":true}
     GET  -> {"test":true,"at":"..."}
     ```
     berarti script bekerja. Cek Drive: spreadsheet `RemiScoreBackup` dibuat, tab `RemiScoreBackup` terisi JSON.
   - Kalau ada error, pesan lengkapnya muncul di Logs — perbaiki dulu di sini.
6. Setelah script terbukti jalan: **Deploy → New deployment → Web app** (Execute as: *Me*, Who has access: *Anyone*) → **Authorize**.
7. Salin **Web app URL**, tempel di Settings → Google Sheets backup.

Backup ditulis ke spreadsheet kamu sebagai tab-tab tabel (headers + row, mudah dibaca):

- `Circles` / `Players` / `Sessions` / `Rounds` / `Scores` / `SessionPlayers`
- Tab `RemiScoreBackup` (disembunyikan) berisi JSON mentah — dipakai app saat import, jangan dihapus.

Catatan:
- **Export**: menimpa seluruh isi sheet dengan backup terbaru.
- **Import**: mengganti **semua** data lokal dengan isi sheet (dikonfirmasi dulu). Last-write-wins, tidak ada merge cerdas.
- Data dikirim tanpa autentikasi — jangan pakai webhook Apps Script untuk data yang butuh kerahasiaan ekstra.

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
