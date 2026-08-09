import type { Circle, Player, Round, Score, Session } from '../db/models';

export const BACKUP_VERSION = 1;

export interface BackupSessionPlayer {
  session_id: number;
  player_id: number;
  is_active: number;
}

export interface BackupTables {
  circles: Circle[];
  players: Player[];
  sessions: Session[];
  rounds: Round[];
  scores: Score[];
  session_players: BackupSessionPlayer[];
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  tables: BackupTables;
}

export function serializeBackup(tables: BackupTables): BackupPayload {
  return { version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables };
}

export function parseBackup(raw: string): BackupPayload {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error('backup.invalidJson');
  }

  const p = payload as Partial<BackupPayload>;
  const t = p?.tables as Partial<BackupTables> | undefined;
  const isArray = (v: unknown): v is unknown[] => Array.isArray(v);
  if (
    p?.version !== BACKUP_VERSION ||
    !t ||
    !isArray(t.circles) ||
    !isArray(t.players) ||
    !isArray(t.sessions) ||
    !isArray(t.rounds) ||
    !isArray(t.scores) ||
    !isArray(t.session_players)
  ) {
    throw new Error('backup.unsupported');
  }

  return p as BackupPayload;
}
