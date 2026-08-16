import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  ensureSchema,
  getCircleByCode,
  isSyncTables,
  nextSyncedAt,
  upsertCircle,
  deleteCircleFromD1,
  type SyncPayload,
} from './db';
import CirclePage from './pages/circle';
import IndexPage from './pages/indexPage';
import NotFound from './pages/notFound';
import PlayerPage from './pages/player';
import SessionPage from './pages/session';

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>({ strict: false });

const CODE_RE = /^[a-z2-9]{6}$/;

async function ensureCircleExists(db: D1Database, code: string): Promise<Record<string, unknown> | null> {
  let shareRow = await db.prepare('SELECT * FROM share_codes WHERE code = ?').bind(code).first();
  if (shareRow) return shareRow;

  try {
    const res = await fetch(`https://kopek.cakson.my.id/api/circle?code=${code}`);
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data.ok && data.circleId) {
        await upsertCircle(
          db,
          {
            shareCode: data.shareCode,
            circleId: data.circleId,
            circleName: data.circleName,
            baseSyncedAt: null,
            tables: {
              players: data.players ?? [],
              sessions: data.sessions ?? [],
              rounds: data.rounds ?? [],
              scores: data.scores ?? [],
              session_players: data.session_players ?? [],
            },
          },
          data.syncedAt ?? new Date().toISOString()
        );
        shareRow = await db.prepare('SELECT * FROM share_codes WHERE code = ?').bind(code).first();
        return shareRow;
      }
    }
  } catch {
    // Ignore remote fallback fetch errors
  }
  return null;
}

app.use('*', async (c, next) => {
  if (c.env?.DB) {
    await ensureSchema(c.env.DB);
  }
  await next();
});

app.use('/api/*', cors());

app.get('/health', (c) => c.json({ ok: true }));

app.get('/', async (c) => {
  const codeParam = c.req.query('code')?.trim().toLowerCase();
  if (codeParam) {
    if (!CODE_RE.test(codeParam)) {
      return c.html(<IndexPage error="Kode harus 6 digit angka/huruf kecil (misal: abc234)." searchedCode={codeParam} />, 400);
    }
    const db = c.env?.DB;
    if (db) {
      const shareRow = await ensureCircleExists(db, codeParam);
      if (shareRow) {
        return c.redirect(`/c/${codeParam}`);
      }
    }
    return c.html(<IndexPage error="Kode tongkrongan tidak ditemukan." searchedCode={codeParam} />, 404);
  }
  return c.html(<IndexPage />);
});

app.get('/api/circle', async (c) => {
  const code = c.req.query('code') ?? '';
  if (!CODE_RE.test(code)) {
    return c.json({ ok: false, error: 'cloud.invalidCode' }, 400);
  }
  const snapshot = await getCircleByCode(c.env.DB, code);
  if (!snapshot) {
    return c.json({ ok: false, error: 'cloud.codeNotFound' }, 404);
  }
  return c.json({ ok: true, ...snapshot });
});

app.post('/api/sync', async (c) => {
  let payload: SyncPayload;
  try {
    payload = await c.req.json<SyncPayload>();
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400);
  }

  if (!CODE_RE.test(payload.shareCode ?? '')) {
    return c.json({ ok: false, error: 'cloud.invalidCode' }, 400);
  }
  if (typeof payload.circleId !== 'number' || !payload.circleName) {
    return c.json({ ok: false, error: 'missing_fields' }, 400);
  }
  if (typeof payload.baseSyncedAt !== 'string' && payload.baseSyncedAt !== null) {
    return c.json({ ok: false, error: 'missing_fields' }, 400);
  }
  if (!isSyncTables(payload.tables)) {
    return c.json({ ok: false, error: 'missing_fields' }, 400);
  }

  const db = c.env.DB;
  const share = await db.prepare('SELECT updated_at FROM share_codes WHERE code = ?').bind(payload.shareCode).first();

  if (share) {
    // CAS: client must be based on the current revision. Stale clients must
    // pull + merge before pushing, so a lagging device can never clobber
    // newer data.
    if (payload.baseSyncedAt !== (share.updated_at as string)) {
      return c.json({ ok: false, error: 'cloud.stale' }, 409);
    }
  } else if (payload.baseSyncedAt !== null) {
    // Pushing to a code that does not exist yet (and never pulled) is invalid.
    return c.json({ ok: false, error: 'cloud.codeNotFound' }, 404);
  }

  const updatedAt = nextSyncedAt(share?.updated_at as string | null | undefined);

  try {
    await upsertCircle(db, payload, updatedAt);
    return c.json({ ok: true, syncedAt: updatedAt });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : 'db_error' }, 500);
  }
});

app.delete('/api/circle/:circleId', async (c) => {
  const circleId = Number(c.req.param('circleId'));
  if (!circleId) return c.json({ ok: false, error: 'invalid_id' }, 400);

  try {
    await deleteCircleFromD1(c.env.DB, circleId);
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : 'db_error' }, 500);
  }
});

app.get('/c/:code', async (c) => {
  const code = c.req.param('code')?.toLowerCase();
  const db = c.env?.DB;
  if (!db) return c.html(<NotFound />, 404);

  const shareRow = await ensureCircleExists(db, code);
  if (!shareRow) return c.html(<NotFound />, 404);

  const circleId = shareRow.circle_id as number;
  const circleName = shareRow.circle_name as string;

  // Season leaderboard
  const statsRows = await db.prepare(`
    SELECT p.id, p.name,
      COALESCE(SUM(s.score_change), 0) AS total,
      COUNT(DISTINCT CASE WHEN s.score_change != 0 THEN r.session_id END) AS sessions_played
    FROM players p
    LEFT JOIN scores s ON s.player_id = p.id
    LEFT JOIN rounds r ON s.round_id = r.id
    WHERE p.circle_id = ?
    GROUP BY p.id
  `).bind(circleId).all();

  // Wins
  const winRows = await db.prepare(`
    SELECT s.player_id, COUNT(*) as wins FROM (
      SELECT sc.player_id, r.session_id,
        RANK() OVER (PARTITION BY r.session_id ORDER BY sc.cumulative_total DESC) as rnk
      FROM scores sc
      JOIN rounds r ON sc.round_id = r.id
      JOIN sessions se ON se.id = r.session_id
      WHERE se.circle_id = ? AND se.status = 'completed'
        AND r.round_number = (SELECT MAX(r2.round_number) FROM rounds r2 WHERE r2.session_id = se.id)
    ) s WHERE s.rnk = 1 GROUP BY s.player_id
  `).bind(circleId).all();

  const winsMap = new Map((winRows.results ?? []).map((r: any) => [r.player_id, r.wins]));

  const leaderboard = (statsRows.results ?? []).map((r: any) => ({
    player: { id: r.id, name: r.name },
    total: r.total,
    sessionsPlayed: r.sessions_played,
    wins: (winsMap.get(r.id) as number) ?? 0,
  }));

  // Active session (live scores)
  const activeSession = await db.prepare(
    "SELECT id FROM sessions WHERE circle_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1"
  ).bind(circleId).first();

  let live = null;
  let liveSessionId = null;

  if (activeSession) {
    liveSessionId = activeSession.id as number;
    const liveRows = await db.prepare(`
      SELECT p.id, p.name, s.cumulative_total, s.score_change, r.round_number
      FROM scores s
      JOIN rounds r ON s.round_id = r.id
      JOIN players p ON s.player_id = p.id
      WHERE r.session_id = ?
      ORDER BY r.round_number DESC
    `).bind(liveSessionId).all();

    const rows = liveRows.results ?? [];
    const maxRound = rows.length > 0 ? Math.max(...rows.map((r: any) => r.round_number)) : 0;
    const prevRound = maxRound > 1 ? maxRound - 1 : 0;

    const latestScores = new Map<number, { total: number; delta: number; name: string }>();
    for (const r of rows as any[]) {
      if (r.round_number === maxRound && !latestScores.has(r.id)) {
        latestScores.set(r.id, { total: r.cumulative_total, delta: r.score_change, name: r.name });
      }
    }

    // Previous round totals for rank comparison
    const prevScores = new Map<number, number>();
    if (prevRound > 0) {
      for (const r of rows as any[]) {
        if (r.round_number === prevRound && !prevScores.has(r.id)) {
          prevScores.set(r.id, r.cumulative_total);
        }
      }
    }

    const sorted = [...latestScores.entries()]
      .map(([id, v]) => ({ player: { id, name: v.name }, total: v.total, lastDelta: v.delta, roundCount: maxRound }))
      .sort((a, b) => b.total - a.total);

    // Previous round ranking (sorted by prev total DESC)
    const prevSorted = [...prevScores.entries()]
      .sort((a, b) => b[1] - a[1]);
    const prevRankMap = new Map<number, number>();
    let prevRank = 0; let prevPrev: number | null = null;
    for (let i = 0; i < prevSorted.length; i++) {
      const [pid, total] = prevSorted[i];
      if (total !== prevPrev) { prevRank = i + 1; prevPrev = total; }
      prevRankMap.set(pid, prevRank);
    }

    let rank = 0, prev: number | null = null;
    live = sorted.map((e, i) => {
      if (e.total !== prev) { rank = i + 1; prev = e.total; }
      const oldRank = prevRankMap.get(e.player.id);
      let rankChange: 'up' | 'down' | 'same' | null = null;
      if (oldRank !== undefined) {
        if (oldRank > rank) rankChange = 'up';
        else if (oldRank < rank) rankChange = 'down';
        else rankChange = 'same';
      }
      return { ...e, rank, rankChange };
    });
  }

  // Recent sessions — assign a per-circle sequential number (1-based, oldest
  // first) so the history list reads "Sesi 1, 2, 3…" instead of raw DB ids.
  // When a session is deleted the remaining sessions are renumbered naturally.
  const sessionsRows = await db.prepare(
    'SELECT id, label, status, created_at, completed_at FROM sessions WHERE circle_id = ? ORDER BY created_at ASC, id ASC LIMIT 50'
  ).bind(circleId).all();

  const seqById = new Map<number, number>();
  (sessionsRows.results ?? []).forEach((s: any, i: number) => {
    seqById.set(s.id, i + 1);
  });

  const recentSessions = [];
  for (const s of ((sessionsRows.results ?? []) as any[]).slice().reverse()) {
    let winnerName = null;
    if (s.status === 'completed') {
      const w = await db.prepare(`
        SELECT p.name FROM scores sc
        JOIN rounds r ON sc.round_id = r.id
        JOIN players p ON sc.player_id = p.id
        WHERE r.session_id = ?
          AND r.round_number = (SELECT MAX(r2.round_number) FROM rounds r2 WHERE r2.session_id = ?)
        ORDER BY sc.cumulative_total DESC LIMIT 1
      `).bind(s.id, s.id).first();
      if (w) winnerName = w.name as string;
    }
    recentSessions.push({ ...s, seq: seqById.get(s.id) ?? 0, winnerName });
  }

  return c.html(
    <CirclePage
      code={code}
      circleName={circleName}
      leaderboard={leaderboard}
      live={live}
      liveSessionId={liveSessionId}
      recentSessions={recentSessions}
    />
  );
});

app.get('/c/:code/session/:sessionId', async (c) => {
  const code = c.req.param('code')?.toLowerCase();
  const sessionId = Number(c.req.param('sessionId'));
  const db = c.env?.DB;
  if (!db) return c.html(<NotFound />, 404);

  const shareRow = await ensureCircleExists(db, code);
  if (!shareRow) return c.html(<NotFound />, 404);

  const circleId = shareRow.circle_id as number;
  const circleName = shareRow.circle_name as string;

  const session = await db.prepare('SELECT * FROM sessions WHERE id = ? AND circle_id = ?')
    .bind(sessionId, circleId).first();
  if (!session) return c.html(<NotFound />, 404);

  // Per-circle sequential session number for display.
  const seqRow = await db.prepare(`
    SELECT COUNT(*) + 1 AS seq FROM sessions
    WHERE circle_id = ? AND (created_at < ? OR (created_at = ? AND id < ?))
  `).bind(circleId, session.created_at, session.created_at, sessionId).first();
  const sessionSeq = (seqRow?.seq as number) ?? 0;

  const scoreRows = await db.prepare(`
    SELECT s.player_id, s.score_change, s.cumulative_total, r.round_number, p.id, p.name
    FROM scores s
    JOIN rounds r ON s.round_id = r.id
    JOIN players p ON s.player_id = p.id
    WHERE r.session_id = ?
    ORDER BY r.round_number ASC, p.name ASC
  `).bind(sessionId).all();

  const playersMap = new Map<number, { id: number; name: string }>();
  const playerTotalsMap = new Map<number, number>();
  const roundsMap = new Map<number, { player: { id: number; name: string }; change: number; total: number }[]>();

  for (const row of (scoreRows.results ?? []) as any[]) {
    playersMap.set(row.player_id, { id: row.player_id, name: row.name });
    playerTotalsMap.set(row.player_id, row.cumulative_total);
    const arr = roundsMap.get(row.round_number) ?? [];
    arr.push({ player: { id: row.player_id, name: row.name }, change: row.score_change, total: row.cumulative_total });
    roundsMap.set(row.round_number, arr);
  }

  const rounds = [...roundsMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([roundNumber, scores]) => ({ roundNumber, scores }));

  // Sort players by total score DESC (highest points first, same as season leaderboard), then name ASC
  const players = [...playersMap.values()].sort((a, b) => {
    const totalA = playerTotalsMap.get(a.id) ?? 0;
    const totalB = playerTotalsMap.get(b.id) ?? 0;
    if (totalB !== totalA) return totalB - totalA;
    return a.name.localeCompare(b.name);
  });

  return c.html(
    <SessionPage
      code={code}
      circleName={circleName}
      sessionSeq={sessionSeq}
      sessionLabel={(session.label as string) ?? `Sesi #${sessionSeq}`}
      status={session.status as string}
      rounds={rounds}
      players={players}
    />
  );
});

app.get('/c/:code/player/:playerId', async (c) => {
  const code = c.req.param('code')?.toLowerCase();
  const playerId = Number(c.req.param('playerId'));
  const db = c.env?.DB;
  if (!db) return c.html(<NotFound />, 404);

  const shareRow = await ensureCircleExists(db, code);
  if (!shareRow) return c.html(<NotFound />, 404);

  const circleId = shareRow.circle_id as number;
  const circleName = shareRow.circle_name as string;

  const player = await db.prepare('SELECT * FROM players WHERE id = ? AND circle_id = ?')
    .bind(playerId, circleId).first();
  if (!player) return c.html(<NotFound />, 404);

  // Calculate season rank
  const rankRows = await db.prepare(`
    SELECT p.id, COALESCE(SUM(s.score_change), 0) as total
    FROM players p
    LEFT JOIN scores s ON s.player_id = p.id
    WHERE p.circle_id = ?
    GROUP BY p.id
    ORDER BY total DESC
  `).bind(circleId).all();

  const sortedPlayers = (rankRows.results ?? []) as { id: number; total: number }[];
  const seasonRank = sortedPlayers.findIndex((p) => p.id === playerId) + 1;

  const stats = await db.prepare(`
    SELECT
      COALESCE(SUM(s.score_change), 0) as total,
      COUNT(*) as rounds_played,
      COALESCE(MAX(s.score_change), 0) as best,
      COALESCE(MIN(s.score_change), 0) as worst,
      COUNT(DISTINCT r.session_id) as sessions_played
    FROM scores s
    JOIN rounds r ON s.round_id = r.id
    WHERE s.player_id = ?
  `).bind(playerId).first();

  const winsRow = await db.prepare(`
    SELECT COUNT(*) as wins FROM (
      SELECT r.session_id FROM scores sc
      JOIN rounds r ON sc.round_id = r.id
      JOIN sessions se ON se.id = r.session_id
      WHERE sc.player_id = ? AND se.status = 'completed'
        AND r.round_number = (SELECT MAX(r2.round_number) FROM rounds r2 WHERE r2.session_id = se.id)
        AND sc.cumulative_total = (
          SELECT MAX(sc2.cumulative_total) FROM scores sc2
          JOIN rounds r3 ON sc2.round_id = r3.id
          WHERE r3.session_id = se.id AND r3.round_number = r.round_number
        )
    )
  `).bind(playerId).first();

  const sessionScoresRows = await db.prepare(`
    SELECT se.id as session_id, se.label, se.status, sc.cumulative_total as total
    FROM scores sc
    JOIN rounds r ON sc.round_id = r.id
    JOIN sessions se ON se.id = r.session_id
    WHERE sc.player_id = ?
      AND r.round_number = (SELECT MAX(r2.round_number) FROM rounds r2 WHERE r2.session_id = se.id)
    ORDER BY se.created_at DESC
  `).bind(playerId).all();

  // Per-circle sequential session number for each session the player joined.
  const sessionIds = (sessionScoresRows.results ?? []).map((r: any) => r.session_id as number);
  const sessionSeqMap = new Map<number, number>();
  if (sessionIds.length > 0) {
    const allSessionsRows = await db.prepare(
      'SELECT id FROM sessions WHERE circle_id = ? ORDER BY created_at ASC, id ASC'
    ).bind(circleId).all();
    (allSessionsRows.results ?? []).forEach((s: any, i: number) => {
      if (sessionIds.includes(s.id)) sessionSeqMap.set(s.id, i + 1);
    });
  }

  const sessionScores = (sessionScoresRows.results ?? []).map((r: any) => ({
    sessionId: r.session_id,
    seq: sessionSeqMap.get(r.session_id) ?? 0,
    label: r.label ?? `Sesi #${sessionSeqMap.get(r.session_id) ?? r.session_id}`,
    total: r.total,
    status: r.status,
  }));

  return c.html(
    <PlayerPage
      code={code}
      circleName={circleName}
      playerName={player.name as string}
      total={(stats?.total as number) ?? 0}
      seasonRank={seasonRank}
      roundsPlayed={(stats?.rounds_played as number) ?? 0}
      best={(stats?.best as number) ?? 0}
      worst={(stats?.worst as number) ?? 0}
      sessionsPlayed={(stats?.sessions_played as number) ?? 0}
      wins={(winsRow?.wins as number) ?? 0}
      sessionScores={sessionScores}
    />
  );
});

export default app;
