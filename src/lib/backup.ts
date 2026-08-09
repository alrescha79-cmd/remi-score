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

export async function importAllData(payload: BackupPayload, mode: 'replace' | 'merge'): Promise<void> {
  const db = await getDb();
  const t = payload.tables;

  await db.withTransactionAsync(async () => {
    if (mode === 'replace') {
      await db.execAsync(`
        DELETE FROM session_players;
        DELETE FROM scores;
        DELETE FROM rounds;
        DELETE FROM sessions;
        DELETE FROM players;
        DELETE FROM circles;
      `);
    }
    await insertAll(db, t);
  });
}

async function insertAll(db: SQLiteDatabase, t: BackupTables): Promise<void> {
  for (const c of t.circles) {
    await db.runAsync('INSERT OR REPLACE INTO circles (id, name, created_at) VALUES (?, ?, ?)', c.id, c.name, c.created_at);
  }
  for (const p of t.players) {
    await db.runAsync(
      'INSERT OR REPLACE INTO players (id, name, circle_id, created_at) VALUES (?, ?, ?, ?)',
      p.id,
      p.name,
      p.circle_id,
      p.created_at
    );
  }
  for (const s of t.sessions) {
    await db.runAsync(
      'INSERT OR REPLACE INTO sessions (id, circle_id, label, status, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
      s.id,
      s.circle_id,
      s.label,
      s.status,
      s.created_at,
      s.completed_at
    );
  }
  for (const r of t.rounds) {
    await db.runAsync(
      'INSERT OR REPLACE INTO rounds (id, session_id, round_number, timestamp) VALUES (?, ?, ?, ?)',
      r.id,
      r.session_id,
      r.round_number,
      r.timestamp
    );
  }
  for (const s of t.scores) {
    await db.runAsync(
      'INSERT OR REPLACE INTO scores (id, round_id, player_id, score_change, cumulative_total) VALUES (?, ?, ?, ?, ?)',
      s.id,
      s.round_id,
      s.player_id,
      s.score_change,
      s.cumulative_total
    );
  }
  for (const sp of t.session_players) {
    await db.runAsync(
      'INSERT OR REPLACE INTO session_players (session_id, player_id, is_active) VALUES (?, ?, ?)',
      sp.session_id,
      sp.player_id,
      sp.is_active
    );
  }
}
