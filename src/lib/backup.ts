import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../db/database';
import type { Circle, Player, Round, Score, Session } from '../db/models';
import type { BackupPayload, BackupSessionPlayer, BackupTables } from './backupCore';
import { serializeBackup } from './backupCore';

export async function exportAllData(): Promise<BackupPayload> {
  const db = await getDb();
  const [circles, players, sessions, rounds, scores, session_players] = await Promise.all([
    db.getAllAsync<Circle>('SELECT * FROM circles'),
    db.getAllAsync<Player>('SELECT * FROM players'),
    db.getAllAsync<Session>('SELECT * FROM sessions'),
    db.getAllAsync<Round>('SELECT * FROM rounds'),
    db.getAllAsync<Score>('SELECT * FROM scores'),
    db.getAllAsync<BackupSessionPlayer>('SELECT * FROM session_players'),
  ]);
  return serializeBackup({ circles, players, sessions, rounds, scores, session_players });
}

export async function exportCircleData(circleId: number): Promise<{
  players: Player[];
  sessions: Session[];
  rounds: Round[];
  scores: Score[];
  session_players: BackupSessionPlayer[];
}> {
  const db = await getDb();
  const [players, sessions, rounds, scores, session_players] = await Promise.all([
    db.getAllAsync<Player>('SELECT * FROM players WHERE circle_id = ? ORDER BY id', circleId),
    db.getAllAsync<Session>('SELECT * FROM sessions WHERE circle_id = ? ORDER BY id', circleId),
    db.getAllAsync<Round>(
      'SELECT r.* FROM rounds r JOIN sessions s ON r.session_id = s.id WHERE s.circle_id = ? ORDER BY r.id',
      circleId
    ),
    db.getAllAsync<Score>(
      'SELECT sc.* FROM scores sc JOIN rounds r ON sc.round_id = r.id JOIN sessions s ON r.session_id = s.id WHERE s.circle_id = ? ORDER BY sc.id',
      circleId
    ),
    db.getAllAsync<BackupSessionPlayer>(
      'SELECT sp.* FROM session_players sp JOIN sessions s ON sp.session_id = s.id WHERE s.circle_id = ? ORDER BY sp.session_id',
      circleId
    ),
  ]);
  return { players, sessions, rounds, scores, session_players };
}

const TABLES: { table: string; cols: string[]; key: keyof BackupTables }[] = [
  { table: 'circles', cols: ['id', 'name', 'created_at'], key: 'circles' },
  { table: 'players', cols: ['id', 'name', 'circle_id', 'created_at'], key: 'players' },
  { table: 'sessions', cols: ['id', 'circle_id', 'label', 'status', 'created_at', 'completed_at'], key: 'sessions' },
  { table: 'rounds', cols: ['id', 'session_id', 'round_number', 'timestamp'], key: 'rounds' },
  { table: 'scores', cols: ['id', 'round_id', 'player_id', 'score_change', 'cumulative_total', 'is_edited'], key: 'scores' },
  { table: 'session_players', cols: ['session_id', 'player_id', 'is_active'], key: 'session_players' },
];

export async function importAllData(payload: BackupPayload): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM session_players;
      DELETE FROM scores;
      DELETE FROM rounds;
      DELETE FROM sessions;
      DELETE FROM players;
      DELETE FROM circles;
    `);
    await insertAll(db, payload.tables);
  });
}

async function insertAll(db: SQLiteDatabase, t: BackupTables): Promise<void> {
  for (const { table, cols, key } of TABLES) {
    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
    for (const row of t[key] as unknown as Record<string, unknown>[]) {
      await db.runAsync(sql, ...cols.map((c) => (row[c] as string | number | null) ?? null));
    }
  }
}
