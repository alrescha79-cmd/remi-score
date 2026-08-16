export const SCORE_STEP = 5;
export const SCORE_MIN = -1000;
export const SCORE_MAX = 1000;

export interface ScoreLike {
  player_id: number;
  round_number: number;
  cumulative_total: number;
}

export interface Ranked<T> {
  item: T;
  score: number;
  rank: number;
}

/**
 * Optional tie-breaker descriptors for ranking.
 * Each entry defines a field accessor plus direction; entries are applied in
 * order until the tie is resolved. The default ranking is by score DESC.
 *
 * For klasemen sesi the spec is: poin sama → menang sesi terbanyak (DESC),
 * → total minus paling sedikit (ASC, i.e. least negative), → jumlah main
 * paling sedikit (ASC).
 */
export interface TieBreaker<T> {
  value: (item: T) => number;
  direction: 'desc' | 'asc';
}

export function validateScore(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= SCORE_MIN &&
    value <= SCORE_MAX &&
    value % SCORE_STEP === 0
  );
}

export function computeTotals(scores: ScoreLike[]): Map<number, number> {
  const totals = new Map<number, number>();
  const seenRound = new Map<number, number>();
  for (const s of scores) {
    const last = seenRound.get(s.player_id) ?? -Infinity;
    if (s.round_number >= last) {
      seenRound.set(s.player_id, s.round_number);
      totals.set(s.player_id, s.cumulative_total);
    }
  }
  return totals;
}

export function rankByScore<T>(
  entries: { item: T; score: number }[],
  tieBreakers: TieBreaker<T>[] = []
): Ranked<T>[] {
  const sorted = [...entries].sort((a, b) => {
    const diff = b.score - a.score;
    if (diff !== 0) return diff;
    for (const tb of tieBreakers) {
      const va = tb.value(a.item);
      const vb = tb.value(b.item);
      const d = tb.direction === 'desc' ? vb - va : va - vb;
      if (d !== 0) return d;
    }
    return 0;
  });
  let rank = 0;
  let prevKey: string | null = null;
  return sorted.map((e, i) => {
    const key = JSON.stringify([
      e.score,
      ...tieBreakers.map((tb) => tb.value(e.item)),
    ]);
    if (key !== prevKey) {
      rank = i + 1;
      prevKey = key;
    }
    return { item: e.item, score: e.score, rank };
  });
}

export function formatSignedScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return value > 0 ? `+${value}` : `${value}`;
}
