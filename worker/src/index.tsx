import { Hono } from 'hono';
import { ensureSchema, upsertCircle, type SyncPayload } from './db';
import CirclePage from './pages/circle';
import NotFound from './pages/notFound';

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

app.use('*', async (c, next) => {
  if (c.env.DB) {
    await ensureSchema(c.env.DB);
  }
  await next();
});

app.get('/health', (c) => c.json({ ok: true }));

app.post('/api/sync', async (c) => {
  let payload: SyncPayload;
  try {
    payload = await c.req.json<SyncPayload>();
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400);
  }

  if (!payload.shareCode || !payload.circleId || !payload.tables) {
    return c.json({ ok: false, error: 'missing_fields' }, 400);
  }

  try {
    await upsertCircle(c.env.DB, payload);
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : 'db_error' }, 500);
  }
});

app.get('/c/:code', async (c) => {
  const code = c.req.param('code');
  const db = c.env.DB;

  const shareRow = await db.prepare('SELECT * FROM share_codes WHERE code = ?').bind(code).first();
  if (!shareRow) return c.html(<NotFound />, 404);

  const circleId = shareRow.circle_id as number;
  const circleName = shareRow.circle_name as string;

  // Season leaderboard
  const statsRows = await db.prepare(`
    SELECT p.id, p.name,
      COALESCE(SUM(s.score_change), 0) AS total,
      COUNT(DISTINCT r.session_id) AS sessions_played
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
    const latestScores = new Map<number, { total: number; delta: number; name: string }>();
    for (const r of rows as any[]) {
      if (r.round_number === maxRound && !latestScores.has(r.id)) {
        latestScores.set(r.id, { total: r.cumulative_total, delta: r.score_change, name: r.name });
      }
    }

    const sorted = [...latestScores.entries()]
      .map(([id, v]) => ({ player: { id, name: v.name }, total: v.total, lastDelta: v.delta, roundCount: maxRound }))
      .sort((a, b) => b.total - a.total);

    let rank = 0, prev: number | null = null;
    live = sorted.map((e, i) => {
      if (e.total !== prev) { rank = i + 1; prev = e.total; }
      return { ...e, rank };
    });
  }

  // Recent sessions
  const sessionsRows = await db.prepare(
    'SELECT id, label, status, created_at, completed_at FROM sessions WHERE circle_id = ? ORDER BY created_at DESC LIMIT 20'
  ).bind(circleId).all();

  const recentSessions = [];
  for (const s of (sessionsRows.results ?? []) as any[]) {
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
    recentSessions.push({ ...s, winnerName });
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

export default app;
