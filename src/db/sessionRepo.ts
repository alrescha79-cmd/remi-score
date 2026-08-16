import { getDb } from './database';
import { listPlayers } from './playerRepo';
import type { Round, RoundEntry, ScoreRow, Session } from './models';

export interface SessionPlayerFlag {
  player_id: number;
  is_active: number;
}

export async function createSession(circleId: number, label?: string): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO sessions (circle_id, label, status) VALUES (?, ?, ?)',
    circleId,
    label?.trim() || null,
    'active'
  );
  const sessionId = result.lastInsertRowId;

  const players = await listPlayers(circleId);
  for (const p of players) {
    await db.runAsync(
      'INSERT OR IGNORE INTO session_players (session_id, player_id) VALUES (?, ?)',
      sessionId,
      p.id
    );
  }
  return sessionId;
}

export async function deleteSession(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sessions WHERE id = ?', id);
}

export async function listSessionPlayers(sessionId: number): Promise<SessionPlayerFlag[]> {
  const db = await getDb();
  return db.getAllAsync<SessionPlayerFlag>(
    'SELECT player_id, is_active FROM session_players WHERE session_id = ?',
    sessionId
  );
}

export async function setSessionPlayerActive(
  sessionId: number,
  playerId: number,
  isActive: boolean
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO session_players (session_id, player_id, is_active) VALUES (?, ?, ?)
     ON CONFLICT (session_id, player_id) DO UPDATE SET is_active = excluded.is_active`,
    sessionId,
    playerId,
    isActive ? 1 : 0
  );
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

    const flags = await db.getAllAsync<SessionPlayerFlag>(
      'SELECT player_id, is_active FROM session_players WHERE session_id = ?',
      sessionId
    );
    const active = new Map(flags.map((f) => [f.player_id, f.is_active === 1]));

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
      const change = active.get(entry.playerId) === false ? 0 : entry.scoreChange;
      await db.runAsync(
        'INSERT INTO scores (round_id, player_id, score_change, cumulative_total) VALUES (?, ?, ?, ?)',
        roundId,
        entry.playerId,
        change,
        base + change
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

/**
 * Replace the score_change values of an existing round and recompute the
 * cumulative_total for that round and every round after it in the session.
 * AFK players (is_active = 0) are forced to a 0 change just like addRound.
 */
export async function updateRound(
  sessionId: number,
  roundNumber: number,
  entries: RoundEntry[]
): Promise<void> {
  if (entries.length === 0) throw new Error('updateRound: no score entries');

  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const round = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM rounds WHERE session_id = ? AND round_number = ?',
      sessionId,
      roundNumber
    );
    if (!round) throw new Error(`updateRound: round ${roundNumber} not found`);

    const flags = await db.getAllAsync<SessionPlayerFlag>(
      'SELECT player_id, is_active FROM session_players WHERE session_id = ?',
      sessionId
    );
    const active = new Map(flags.map((f) => [f.player_id, f.is_active === 1]));

    // Snapshot the previous round's cumulative totals (the base for recompute).
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

    // Apply the new score_change values to the edited round.
    for (const entry of entries) {
      const change = active.get(entry.playerId) === false ? 0 : entry.scoreChange;
      const base = prevByPlayer.get(entry.playerId) ?? 0;
      await db.runAsync(
        `UPDATE scores SET score_change = ?, cumulative_total = ?
         WHERE round_id = ? AND player_id = ?`,
        change,
        base + change,
        round.id,
        entry.playerId
      );
    }

    // Recompute cumulative totals for all subsequent rounds.
    const laterRounds = await db.getAllAsync<{ id: number; round_number: number }>(
      'SELECT id, round_number FROM rounds WHERE session_id = ? AND round_number > ? ORDER BY round_number ASC',
      sessionId,
      roundNumber
    );

    // Running totals start from the edited round's totals.
    let running = new Map<number, number>();
    const editedRows = await db.getAllAsync<{ player_id: number; cumulative_total: number }>(
      'SELECT player_id, cumulative_total FROM scores WHERE round_id = ?',
      round.id
    );
    for (const r of editedRows) running.set(r.player_id, r.cumulative_total);

    for (const lr of laterRounds) {
      const rows = await db.getAllAsync<{ player_id: number; score_change: number }>(
        'SELECT player_id, score_change FROM scores WHERE round_id = ?',
        lr.id
      );
      for (const r of rows) {
        const next = (running.get(r.player_id) ?? 0) + r.score_change;
        await db.runAsync(
          'UPDATE scores SET cumulative_total = ? WHERE round_id = ? AND player_id = ?',
          next,
          lr.id,
          r.player_id
        );
        running.set(r.player_id, next);
      }
    }
  });
}

export async function deleteRound(sessionId: number, roundNumber: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const round = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM rounds WHERE session_id = ? AND round_number = ?',
      sessionId,
      roundNumber
    );
    if (!round) return;

    await db.runAsync('DELETE FROM rounds WHERE id = ?', round.id);

    // Renumber subsequent rounds down by one.
    const later = await db.getAllAsync<{ id: number; round_number: number }>(
      'SELECT id, round_number FROM rounds WHERE session_id = ? AND round_number > ? ORDER BY round_number ASC',
      sessionId,
      roundNumber
    );
    for (const r of later) {
      await db.runAsync(
        'UPDATE rounds SET round_number = ? WHERE id = ?',
        r.round_number - 1,
        r.id
      );
    }

    // Recompute cumulative totals for all rounds from the (now deleted) one onward.
    const editedRows = await db.getAllAsync<{ player_id: number; cumulative_total: number }>(
      `
      SELECT s.player_id, s.cumulative_total
      FROM scores s JOIN rounds r ON s.round_id = r.id
      WHERE r.session_id = ? AND r.round_number = ?
      `,
      sessionId,
      roundNumber - 1
    );
    let running = new Map<number, number>();
    for (const r of editedRows) running.set(r.player_id, r.cumulative_total);

    const laterRounds = await db.getAllAsync<{ id: number; round_number: number }>(
      'SELECT id, round_number FROM rounds WHERE session_id = ? AND round_number >= ? ORDER BY round_number ASC',
      sessionId,
      roundNumber
    );
    for (const lr of laterRounds) {
      const rows = await db.getAllAsync<{ player_id: number; score_change: number }>(
        'SELECT player_id, score_change FROM scores WHERE round_id = ?',
        lr.id
      );
      for (const r of rows) {
        const next = (running.get(r.player_id) ?? 0) + r.score_change;
        await db.runAsync(
          'UPDATE scores SET cumulative_total = ? WHERE round_id = ? AND player_id = ?',
          next,
          lr.id,
          r.player_id
        );
        running.set(r.player_id, next);
      }
    }
  });
}
