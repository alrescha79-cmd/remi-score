export function generateShareCode(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export interface CloudSyncPayload {
  shareCode: string;
  circleId: number;
  circleName: string;
  tables: {
    players: { id: number; name: string; circle_id: number; created_at: string }[];
    sessions: { id: number; circle_id: number; label: string | null; status: string; created_at: string; completed_at: string | null }[];
    rounds: { id: number; session_id: number; round_number: number; timestamp: string }[];
    scores: { id: number; round_id: number; player_id: number; score_change: number; cumulative_total: number }[];
    session_players: { session_id: number; player_id: number; is_active: number }[];
  };
}

export function validateShareCode(code: string): boolean {
  return /^[a-z2-9]{6}$/.test(code);
}
