import { getDb } from './database';
import { listPlayers } from './playerRepo';
import { listRoundScores, listSessions } from './sessionRepo';
import { computeTotals } from '../lib/score';
import type { Player, SeasonPlayerStat, SessionSummary } from './models';

export async function getSeasonStats(circleId: number): Promise<SeasonPlayerStat[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Player & { total: number; minus: number; sessions: number }>(
    `
    SELECT p.*,
      COALESCE(SUM(s.score_change), 0) AS total,
      COALESCE(SUM(CASE WHEN s.score_change < 0 THEN s.score_change ELSE 0 END), 0) AS minus,
      COUNT(DISTINCT CASE WHEN s.score_change != 0 THEN r.session_id END) AS sessions
    FROM players p
    LEFT JOIN scores s ON s.player_id = p.id
    LEFT JOIN rounds r ON s.round_id = r.id
    WHERE p.circle_id = ?
    GROUP BY p.id
    `,
    circleId
  );

  const wins = await countWins(circleId);
  return rows.map((r) => ({
    player: { id: r.id, name: r.name, circle_id: r.circle_id, created_at: r.created_at },
    total: r.total,
    minus: r.minus,
    sessionsPlayed: r.sessions,
    wins: wins.get(r.id) ?? 0,
  }));
}

async function countWins(circleId: number): Promise<Map<number, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ session_id: number; player_id: number; cumulative_total: number }>(
    `
    SELECT r.session_id, s.player_id, s.cumulative_total
    FROM scores s
    JOIN rounds r ON s.round_id = r.id
    JOIN sessions se ON se.id = r.session_id
    WHERE se.circle_id = ? AND se.status = 'completed'
      AND r.round_number = (SELECT MAX(r2.round_number) FROM rounds r2 WHERE r2.session_id = se.id)
    `,
    circleId
  );

  const bySession = new Map<number, { player_id: number; cumulative_total: number }[]>();
  for (const row of rows) {
    const arr = bySession.get(row.session_id) ?? [];
    arr.push(row);
    bySession.set(row.session_id, arr);
  }

  const wins = new Map<number, number>();
  for (const entries of bySession.values()) {
    const max = Math.max(...entries.map((e) => e.cumulative_total));
    for (const e of entries) {
      if (e.cumulative_total === max) wins.set(e.player_id, (wins.get(e.player_id) ?? 0) + 1);
    }
  }
  return wins;
}

export async function getSessionSummaries(circleId: number): Promise<SessionSummary[]> {
  const players = await listPlayers(circleId);
  const byId = new Map(players.map((p) => [p.id, p]));

  const sessions = await listSessions(circleId);
  const summaries: SessionSummary[] = [];

  for (const session of sessions) {
    const scores = await listRoundScores(session.id);
    const totals = computeTotals(scores);
    summaries.push({
      session,
      players: [...totals.entries()]
        .map(([playerId, total]) => ({ player: byId.get(playerId)!, total }))
        .filter((e) => e.player),
    });
  }
  return summaries;
}
