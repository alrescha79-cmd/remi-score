export interface Circle {
  id: number;
  name: string;
  created_at: string;
}

export interface Player {
  id: number;
  name: string;
  circle_id: number;
  created_at: string;
}

export type SessionStatus = 'active' | 'completed';

export interface Session {
  id: number;
  circle_id: number;
  label: string | null;
  status: SessionStatus;
  created_at: string;
  completed_at: string | null;
}

export interface Round {
  id: number;
  session_id: number;
  round_number: number;
  timestamp: string;
}

export interface Score {
  id: number;
  round_id: number;
  player_id: number;
  score_change: number;
  cumulative_total: number;
}

export interface CircleStats {
  sessionCount: number;
  lastActivityAt: string | null;
}

export interface CircleWithStats extends Circle {
  stats: CircleStats;
}

export interface SessionPlayer {
  player: Player;
  total: number;
}

export interface RoundEntry {
  playerId: number;
  scoreChange: number;
}

export interface ScoreRow extends Score {
  player_name: string;
  round_number: number;
  timestamp: string;
}

export interface SessionSummary {
  session: Session;
  players: { player: Player; total: number }[];
}

export interface SeasonPlayerStat {
  player: Player;
  total: number;
  sessionsPlayed: number;
  wins: number;
}
