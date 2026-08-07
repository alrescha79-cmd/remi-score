import { getDb } from './database';
import type { Round, RoundEntry, ScoreRow, Session } from './models';

export async function createSession(circleId: number, label?: string): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO sessions (circle_id, label, status) VALUES (?, ?, ?)',
    circleId,
    label?.trim() || null,
    'active'
  );
  return result.lastInsertRowId;
}

export async function getSession(id: number): Promise<Session | null> {
  const db = await getDb();
  return db.getFirstAsync<Session>('SELECT * FROM sessions WHERE id = ?', id);
}

export async function getActiveSession(circleId: number): Promise<Session | null> {
  const db = await getDb();
  return db.getFirstAsync<Session>(
    "SELECT * FROM sessions WHERE circle_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
    circleId
  );
}

export async function listSessions(circleId: number): Promise<Session[]> {
  const db = await getDb();
  return db.getAllAsync<Session>(
    'SELECT * FROM sessions WHERE circle_id = ? ORDER BY created_at DESC',
    circleId
  );
}

export async function listRoundScores(sessionId: number): Promise<ScoreRow[]> {
  const db = await getDb();
  return db.getAllAsync<ScoreRow>(
    `
    SELECT s.*, r.round_number, r.timestamp, p.name AS player_name
    FROM scores s
    JOIN rounds r ON s.round_id = r.id
    JOIN players p ON s.player_id = p.id
    WHERE r.session_id = ?
    ORDER BY r.round_number ASC, p.name ASC
    `,
    sessionId
  );
}

export async function addRound(sessionId: number, entries: RoundEntry[]): Promise<void> {
  if (entries.length === 0) throw new Error('addRound: no score entries');

  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ n: number }>(
      'SELECT COALESCE(MAX(round_number), 0) AS n FROM rounds WHERE session_id = ?',
      sessionId
    );
    const roundNumber = (row?.n ?? 0) + 1;

    const prev = await db.getAllAsync<{ player_id: number; cumulative_total: number }>(
      `
      SELECT s.player_id, s.cumulative_total
      FROM scores s JOIN rounds r ON s.round_id = r.id
      WHERE r.session_id = ? AND r.round_number = ?
      `,
      sessionId,
      roundNumber - 1
    );
    const prevByPlayer = new Map(prev.map((p) => [p.player_id, p.cumulative_total]));

    const result = await db.runAsync(
      'INSERT INTO rounds (session_id, round_number, timestamp) VALUES (?, ?, ?)',
      sessionId,
      roundNumber,
      new Date().toISOString()
    );
    const roundId = result.lastInsertRowId;

    for (const entry of entries) {
      const base = prevByPlayer.get(entry.playerId) ?? 0;
      await db.runAsync(
        'INSERT INTO scores (round_id, player_id, score_change, cumulative_total) VALUES (?, ?, ?, ?)',
        roundId,
        entry.playerId,
        entry.scoreChange,
        base + entry.scoreChange
      );
    }
  });
}

export async function completeSession(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE sessions SET status = 'completed', completed_at = ? WHERE id = ?",
    new Date().toISOString(),
    id
  );
}

export async function latestRounds(sessionId: number, limit: number): Promise<Round[]> {
  const db = await getDb();
  return db.getAllAsync<Round>(
    'SELECT * FROM rounds WHERE session_id = ? ORDER BY round_number DESC LIMIT ?',
    sessionId,
    limit
  );
}
