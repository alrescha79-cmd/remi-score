const SCHEMA = `
  CREATE TABLE IF NOT EXISTS share_codes (
    code TEXT PRIMARY KEY,
    circle_id INTEGER NOT NULL,
    circle_name TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS circles (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    circle_id INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY,
    circle_id INTEGER NOT NULL,
    label TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY,
    round_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    score_change INTEGER NOT NULL,
    cumulative_total INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS session_players (
    session_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (session_id, player_id)
  );

  CREATE INDEX IF NOT EXISTS idx_players_circle ON players(circle_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_circle ON sessions(circle_id);
  CREATE INDEX IF NOT EXISTS idx_rounds_session ON rounds(session_id);
  CREATE INDEX IF NOT EXISTS idx_scores_round ON scores(round_id);
  CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_id);
`;

export async function ensureSchema(db: D1Database): Promise<void> {
  const statements = SCHEMA.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
  await db.batch(statements.map((s) => db.prepare(s)));
}

export interface SyncTables {
  players: { id: number; name: string; circle_id: number; created_at: string }[];
  sessions: { id: number; circle_id: number; label: string | null; status: string; created_at: string; completed_at: string | null }[];
  rounds: { id: number; session_id: number; round_number: number; timestamp: string }[];
  scores: { id: number; round_id: number; player_id: number; score_change: number; cumulative_total: number }[];
  session_players: { session_id: number; player_id: number; is_active: number }[];
}

export interface SyncPayload {
  shareCode: string;
  circleId: number;
  circleName: string;
  baseSyncedAt: string | null;
  tables: SyncTables;
}

export interface CircleSnapshot extends SyncTables {
  shareCode: string;
  circleId: number;
  circleName: string;
  syncedAt: string;
}

export const SYNC_TABLES = ['players', 'sessions', 'rounds', 'scores', 'session_players'] as const;

export function isSyncTables(v: unknown): v is SyncTables {
  return (
    typeof v === 'object' &&
    v !== null &&
    SYNC_TABLES.every((t) => Array.isArray((v as Record<string, unknown>)[t]))
  );
}

/**
 * Monotonic strictly-increasing revision timestamp for a circle.
 * Guarantees two pushes can never share the same `updated_at`, so a
 * strict-equality CAS check on the client's baseSyncedAt is safe.
 */
export function nextSyncedAt(prev: string | null | undefined): string {
  const now = new Date();
  if (prev) {
    const prevMs = Date.parse(prev);
    if (Number.isFinite(prevMs) && now.getTime() <= prevMs) {
      return new Date(prevMs + 1).toISOString();
    }
  }
  return now.toISOString();
}

export async function getCircleByCode(db: D1Database, code: string): Promise<CircleSnapshot | null> {
  const share = await db.prepare('SELECT * FROM share_codes WHERE code = ?').bind(code).first();
  if (!share) return null;

  const circleId = share.circle_id as number;
  const [players, sessions] = await Promise.all([
    db.prepare('SELECT * FROM players WHERE circle_id = ? ORDER BY id').bind(circleId).all(),
    db.prepare('SELECT * FROM sessions WHERE circle_id = ? ORDER BY id').bind(circleId).all(),
  ]);
  const sessionIds = (sessions.results ?? []).map((s) => s.id as number);

  let rounds: { results: unknown[] } = { results: [] };
  let scores: { results: unknown[] } = { results: [] };
  let sessionPlayers: { results: unknown[] } = { results: [] };

  if (sessionIds.length > 0) {
    const placeholders = sessionIds.map(() => '?').join(',');
    const roundRes = await db.prepare(`SELECT * FROM rounds WHERE session_id IN (${placeholders}) ORDER BY id`).bind(...sessionIds).all();
    rounds = roundRes;
    const roundIds = (roundRes.results ?? []).map((r) => r.id as number);
    if (roundIds.length > 0) {
      scores = await db.prepare(`SELECT * FROM scores WHERE round_id IN (${roundIds.map(() => '?').join(',')}) ORDER BY id`).bind(...roundIds).all();
    }
    sessionPlayers = await db.prepare(`SELECT * FROM session_players WHERE session_id IN (${placeholders}) ORDER BY session_id`).bind(...sessionIds).all();
  }

  return {
    shareCode: code,
    circleId,
    circleName: share.circle_name as string,
    syncedAt: share.updated_at as string,
    players: (players.results ?? []) as SyncTables['players'],
    sessions: (sessions.results ?? []) as SyncTables['sessions'],
    rounds: (rounds.results ?? []) as SyncTables['rounds'],
    scores: (scores.results ?? []) as SyncTables['scores'],
    session_players: (sessionPlayers.results ?? []) as SyncTables['session_players'],
  };
}

export async function upsertCircle(db: D1Database, payload: SyncPayload, updatedAt: string): Promise<void> {
  const { shareCode, circleId, circleName, tables } = payload;
  const now = new Date().toISOString();

  const sessionIds = tables.sessions.map((s) => s.id);
  const roundIds = tables.rounds.map((r) => r.id);

  const stmts: D1PreparedStatement[] = [];

  stmts.push(
    db.prepare('INSERT OR REPLACE INTO share_codes (code, circle_id, circle_name, updated_at) VALUES (?, ?, ?, ?)')
      .bind(shareCode, circleId, circleName, updatedAt)
  );

  stmts.push(
    db.prepare('INSERT OR REPLACE INTO circles (id, name, created_at) VALUES (?, ?, ?)')
      .bind(circleId, circleName, now)
  );

  if (roundIds.length > 0) {
    stmts.push(db.prepare(`DELETE FROM scores WHERE round_id IN (${roundIds.map(() => '?').join(',')})`)
      .bind(...roundIds));
  }
  if (sessionIds.length > 0) {
    stmts.push(db.prepare(`DELETE FROM rounds WHERE session_id IN (${sessionIds.map(() => '?').join(',')})`)
      .bind(...sessionIds));
    stmts.push(db.prepare(`DELETE FROM session_players WHERE session_id IN (${sessionIds.map(() => '?').join(',')})`)
      .bind(...sessionIds));
  }
  stmts.push(db.prepare('DELETE FROM sessions WHERE circle_id = ?').bind(circleId));
  stmts.push(db.prepare('DELETE FROM players WHERE circle_id = ?').bind(circleId));

  for (const p of tables.players) {
    stmts.push(db.prepare('INSERT INTO players (id, name, circle_id, created_at) VALUES (?, ?, ?, ?)')
      .bind(p.id, p.name, p.circle_id, p.created_at));
  }
  for (const s of tables.sessions) {
    stmts.push(db.prepare('INSERT INTO sessions (id, circle_id, label, status, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(s.id, s.circle_id, s.label, s.status, s.created_at, s.completed_at));
  }
  for (const r of tables.rounds) {
    stmts.push(db.prepare('INSERT INTO rounds (id, session_id, round_number, timestamp) VALUES (?, ?, ?, ?)')
      .bind(r.id, r.session_id, r.round_number, r.timestamp));
  }
  for (const sc of tables.scores) {
    stmts.push(db.prepare('INSERT INTO scores (id, round_id, player_id, score_change, cumulative_total) VALUES (?, ?, ?, ?, ?)')
      .bind(sc.id, sc.round_id, sc.player_id, sc.score_change, sc.cumulative_total));
  }
  for (const sp of tables.session_players) {
    stmts.push(db.prepare('INSERT INTO session_players (session_id, player_id, is_active) VALUES (?, ?, ?)')
      .bind(sp.session_id, sp.player_id, sp.is_active));
  }

  await db.batch(stmts);
}

export async function deleteCircleFromD1(db: D1Database, circleId: number): Promise<void> {
  const stmts: D1PreparedStatement[] = [
    db.prepare('DELETE FROM share_codes WHERE circle_id = ?').bind(circleId),
    db.prepare('DELETE FROM scores WHERE round_id IN (SELECT r.id FROM rounds r JOIN sessions s ON r.session_id = s.id WHERE s.circle_id = ?)').bind(circleId),
    db.prepare('DELETE FROM rounds WHERE session_id IN (SELECT id FROM sessions WHERE circle_id = ?)').bind(circleId),
    db.prepare('DELETE FROM session_players WHERE session_id IN (SELECT id FROM sessions WHERE circle_id = ?)').bind(circleId),
    db.prepare('DELETE FROM sessions WHERE circle_id = ?').bind(circleId),
    db.prepare('DELETE FROM players WHERE circle_id = ?').bind(circleId),
    db.prepare('DELETE FROM circles WHERE id = ?').bind(circleId),
  ];
  await db.batch(stmts);
}
