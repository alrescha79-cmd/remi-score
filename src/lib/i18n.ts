import { useSettingsStore, type Lang } from '@/store/settingsStore';

const en: Record<string, string> = {
  'home.tagline': 'sirkel tongkrongan',
  'home.circles': 'Circles',
  'home.noCircles': 'No circles yet. Tap + to create one.',
  'home.newCircle': 'New circle',
  'home.newCircleHint': 'e.g. "Warkop Malam Minggu"',
  'home.circleName': 'Circle name',
  'home.create': 'Create',
  'home.sessions': '{count} sessions',
  'home.sessionsOne': '{count} session',
  'home.lastActivity': 'last {date}',

  'circle.start': 'Start new session',
  'circle.resume': 'Resume active session',
  'circle.players': 'Players',
  'circle.addPlayer': 'Add player name',
  'circle.noPlayers': 'No players yet. Add 2–7 to start scoring.',
  'circle.leaderboard': 'Season leaderboard',
  'circle.noLeaderboard': 'No sessions yet. Leaderboard builds over time.',
  'circle.wins': '{count} win',
  'circle.winsMany': '{count} wins',
  'circle.sessionsShort': '{count} session',
  'circle.sessionsShortMany': '{count} sessions',
  'circle.history': 'History',
  'circle.noHistory': 'No sessions yet.',
  'circle.finished': 'FINISHED',
  'circle.active': 'ACTIVE',
  'circle.winner': 'Winner: {names}',
  'circle.deleteTitle': 'Delete circle',
  'circle.deleteMsg': 'Delete "{name}" and all its data?',
  'circle.removePlayerTitle': 'Remove player',
  'circle.removePlayerMsg': 'Remove "{name}" from this circle?',

  'session.live': 'Live session',
  'session.rounds': '{count} round',
  'session.roundsMany': '{count} rounds',
  'session.players': '{count} players',
  'session.noScores': 'No scores yet. Add the first round.',
  'session.addRound': 'Add round',
  'session.end': 'End session',
  'session.endTitle': 'End session',
  'session.endMsg': 'Finish this session and record the final ranking?',
  'session.endConfirm': 'End session',
  'session.roundLabel': 'Round {n}',

  'round.title': 'Round {n}',
  'round.subtitle': "Enter each player's score (multiples of 5)",
  'round.invalid': 'All scores must be whole multiples of 5',
  'round.save': 'Save round',
  'round.saving': 'Saving…',

  'player.history': 'Round history',
  'player.total': 'Total',
  'player.rounds': 'Rounds played',
  'player.best': 'Best round',
  'player.worst': 'Worst round',
  'player.notFound': 'Player not found',

  'settings.title': 'Settings',
  'settings.theme': 'Theme',
  'settings.themeHint': 'Appearance follows your vibe',
  'settings.system': 'System',
  'settings.light': 'Light',
  'settings.dark': 'Dark',
  'settings.language': 'Language',
  'settings.langHint': 'Tongkrongan vibes guaranteed',
  'settings.english': 'English',
  'settings.indonesia': 'Indonesia',

  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.remove': 'Remove',
  'common.error': 'Error',
  'common.failedRound': 'Failed to save round',
};

const id: Record<string, string> = {
  'home.tagline': 'basecamp main remi',
  'home.circles': 'Geng',
  'home.noCircles': 'Belum ada geng. Ketuk + buat satu.',
  'home.newCircle': 'Geng baru',
  'home.newCircleHint': 'misal "Warkop Malam Minggu"',
  'home.circleName': 'Nama geng',
  'home.create': 'Bikin',
  'home.sessions': '{count} sesi',
  'home.sessionsOne': '{count} sesi',
  'home.lastActivity': 'terakhir {date}',

  'circle.start': 'Gas main baru',
  'circle.resume': 'Lanjut sesi aktif',
  'circle.players': 'Pemain',
  'circle.addPlayer': 'Nama pemain baru',
  'circle.noPlayers': 'Belum ada pemain. Tambah 2–7 biar bisa mulai.',
  'circle.leaderboard': 'Klasemen musim',
  'circle.noLeaderboard': 'Belum ada sesi, klasemen masih kosong. Gas main biar rame!',
  'circle.wins': '{count} menang',
  'circle.winsMany': '{count} menang',
  'circle.sessionsShort': '{count} sesi',
  'circle.sessionsShortMany': '{count} sesi',
  'circle.history': 'Riwayat',
  'circle.noHistory': 'Belum ada sesi.',
  'circle.finished': 'SELESAI',
  'circle.active': 'AKTIF',
  'circle.winner': 'Juara: {names}',
  'circle.deleteTitle': 'Hapus geng',
  'circle.deleteMsg': 'Hapus "{name}" dan semua datanya?',
  'circle.removePlayerTitle': 'Hapus pemain',
  'circle.removePlayerMsg': 'Cabut "{name}" dari geng ini?',

  'session.live': 'Sesi live',
  'session.rounds': '{count} ronde',
  'session.roundsMany': '{count} ronde',
  'session.players': '{count} pemain',
  'session.noScores': 'Belum ada poin. Gas ronde pertama!',
  'session.addRound': 'Tambah ronde',
  'session.end': 'Selesai main',
  'session.endTitle': 'Akhiri sesi',
  'session.endMsg': 'Tutup sesi ini dan catat ranking final?',
  'session.endConfirm': 'Selesai',
  'session.roundLabel': 'Ronde {n}',

  'round.title': 'Ronde {n}',
  'round.subtitle': 'Isi skor tiap pemain (kelipatan 5)',
  'round.invalid': 'Semua skor wajib kelipatan 5',
  'round.save': 'Simpan ronde',
  'round.saving': 'Nyimpen…',

  'player.history': 'Riwayat ronde',
  'player.total': 'Total',
  'player.rounds': 'Ronde dimainkan',
  'player.best': 'Ronde terbaik',
  'player.worst': 'Ronde terburuk',
  'player.notFound': 'Pemain nggak ketemu',

  'settings.title': 'Setelan',
  'settings.theme': 'Tema',
  'settings.themeHint': 'Tampilan ngikutin vibe kamu',
  'settings.system': 'Sistem',
  'settings.light': 'Terang',
  'settings.dark': 'Gelap',
  'settings.language': 'Bahasa',
  'settings.langHint': 'Dijamin rame, khas tongkrongan',
  'settings.english': 'English',
  'settings.indonesia': 'Indonesia',

  'common.cancel': 'Batal',
  'common.delete': 'Hapus',
  'common.remove': 'Cabut',
  'common.error': 'Eror',
  'common.failedRound': 'Gagal nyimpen ronde',
};

const dicts: Record<Lang, Record<string, string>> = { en, id };

function plural(lang: Lang, key: string, count: number): string {
  const many = dicts[lang][key + 'Many'];
  if (many && count !== 1) return many;
  return dicts[lang][key];
}

export function t(key: string, params?: Record<string, string | number>): string {
  const { lang } = useSettingsStore.getState();
  let text = plural(lang, key, typeof params?.count === 'number' ? params.count : -1);
  if (text === undefined) text = dicts.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

export function useT(): typeof t {
  useSettingsStore((s) => s.lang);
  return t;
}
