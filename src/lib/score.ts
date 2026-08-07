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

export function rankByScore<T>(entries: { item: T; score: number }[]): Ranked<T>[] {
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  let rank = 0;
  let prevScore: number | null = null;
  return sorted.map((e, i) => {
    if (e.score !== prevScore) {
      rank = i + 1;
      prevScore = e.score;
    }
    return { item: e.item, score: e.score, rank };
  });
}

export function formatSignedScore(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}
