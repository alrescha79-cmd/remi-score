import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from './database';
import { exportCircleData } from '../lib/backup';
import type {
  CloudSnapshot,
  MergeResult,
  SyncIdMapEntry,
  SyncTableName,
  SyncTables,
} from '../lib/cloudSyncCore';
import { mergeSnapshots } from '../lib/cloudSyncCore';

const TABLES: SyncTableName[] = ['players', 'sessions', 'rounds', 'scores', 'session_players'];

const COLS: Record<SyncTableName, string[]> = {
  players: ['id', 'name', 'circle_id', 'created_at'],
  sessions: ['id', 'circle_id', 'label', 'status', 'created_at', 'completed_at'],
  rounds: ['id', 'session_id', 'round_number', 'timestamp'],
  scores: ['id', 'round_id', 'player_id', 'score_change', 'cumulative_total'],
  session_players: ['session_id', 'player_id', 'is_active'],
};

export async function getAllTakenIds(): Promise<Record<SyncTableName, Set<number>>> {
  const db = await getDb();
  const out = {
    players: new Set(),
    sessions: new Set(),
    rounds: new Set(),
    scores: new Set(),
    session_players: new Set(),
  } as Record<SyncTableName, Set<number>>;
  // session_players is composite-keyed (no id column); skip its query.
  for (const table of TABLES) {
    if (table === 'session_players') continue;
    const rows = await db.getAllAsync<{ id: number }>(`SELECT id FROM ${table}`);
    out[table] = new Set(rows.map((r) => r.id));
  }
  return out;
}

export async function getPushMap(): Promise<SyncIdMapEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ table_name: SyncTableName; local_id: number; remote_id: number }>(
    'SELECT * FROM sync_id_map'
  );
  return rows.map((r) => ({ table: r.table_name, localId: r.local_id, remoteId: r.remote_id }));
}

/**
 * Remove sync_id_map entries owned by a circle before it is deleted locally.
 */
export async function purgeSyncMapForCircle(circleId: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const players = await db.getAllAsync<{ id: number }>('SELECT id FROM players WHERE circle_id = ?', circleId);
    for (const p of players) await db.runAsync("DELETE FROM sync_id_map WHERE table_name = 'players' AND local_id = ?", p.id);
    const sessions = await db.getAllAsync<{ id: number }>('SELECT id FROM sessions WHERE circle_id = ?', circleId);
    for (const s of sessions) await db.runAsync("DELETE FROM sync_id_map WHERE table_name = 'sessions' AND local_id = ?", s.id);
    const rounds = await db.getAllAsync<{ id: number }>(
      'SELECT r.id FROM rounds r JOIN sessions s ON r.session_id = s.id WHERE s.circle_id = ?',
      circleId
    );
    for (const r of rounds) await db.runAsync("DELETE FROM sync_id_map WHERE table_name = 'rounds' AND local_id = ?", r.id);
    const scores = await db.getAllAsync<{ id: number }>(
      'SELECT sc.id FROM scores sc JOIN rounds r ON sc.round_id = r.id JOIN sessions s ON r.session_id = s.id WHERE s.circle_id = ?',
      circleId
    );
    for (const sc of scores) await db.runAsync("DELETE FROM sync_id_map WHERE table_name = 'scores' AND local_id = ?", sc.id);
  });
}

async function deleteCircleTables(db: SQLiteDatabase, circleId: number): Promise<void> {
  await db.runAsync(
    'DELETE FROM scores WHERE round_id IN (SELECT r.id FROM rounds r JOIN sessions s ON r.session_id = s.id WHERE s.circle_id = ?)',
    circleId
  );
  await db.runAsync('DELETE FROM rounds WHERE session_id IN (SELECT id FROM sessions WHERE circle_id = ?)', circleId);
  await db.runAsync('DELETE FROM session_players WHERE session_id IN (SELECT id FROM sessions WHERE circle_id = ?)', circleId);
  await db.runAsync('DELETE FROM sessions WHERE circle_id = ?', circleId);
  await db.runAsync('DELETE FROM players WHERE circle_id = ?', circleId);
}

async function replacePushMap(db: SQLiteDatabase, entries: SyncIdMapEntry[]): Promise<void> {
  await db.runAsync('DELETE FROM sync_id_map');
  for (const e of entries) {
    await db.runAsync('INSERT INTO sync_id_map (table_name, local_id, remote_id) VALUES (?, ?, ?)', e.table, e.localId, e.remoteId);
  }
}

async function writeTables(db: SQLiteDatabase, circleId: number, tables: SyncTables): Promise<void> {
  await deleteCircleTables(db, circleId);
  for (const table of TABLES) {
    const cols = COLS[table];
    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
    const rows = tables[table].map((row) => {
      const next = { ...row };
      if (table === 'players' || table === 'sessions') next.circle_id = circleId;
      return next;
    });
    for (const row of rows) {
      await db.runAsync(sql, ...cols.map((c) => (row[c] as string | number | null) ?? null));
    }
  }
}

async function alignSequences(db: SQLiteDatabase, tables: SyncTables): Promise<void> {
  for (const table of TABLES) {
    const max = tables[table].reduce((m, r) => Math.max(m, (r.id as number) ?? 0), 0);
    if (max === 0) continue;
    const cur = await db.getFirstAsync<{ seq: number }>(
      'SELECT seq FROM sqlite_sequence WHERE name = ?',
      table
    );
    if (!cur) {
      await db.runAsync('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)', table, max);
    } else if (cur.seq < max) {
      await db.runAsync('UPDATE sqlite_sequence SET seq = ? WHERE name = ?', max, table);
    }
  }
}

/**
 * Merge a remote snapshot into a local circle (fresh join or pull). Returns
 * the merge result so the caller can update the persisted sync metadata.
 *
 * @param baseSyncedAt  syncedAt value before this pull. When `snapshot.syncedAt`
 * equals `baseSyncedAt` the remote hasn't changed since our last sync, so any
 * local-vs-remote difference is a local edit that must win on push.
 */
export async function syncCircleFromSnapshot(
  localCircleId: number,
  snapshot: CloudSnapshot,
  baseSyncedAt: string | null
): Promise<MergeResult> {
  const db = await getDb();
  const local = (await exportCircleData(localCircleId)) as unknown as SyncTables;
  const pushMap = await getPushMap();
  const takenIds = await getAllTakenIds();
  const merged = mergeSnapshots({
    local,
    remote: snapshot.tables,
    pushMap,
    takenIds,
    remoteChanged: snapshot.syncedAt !== baseSyncedAt,
  });

  await db.withTransactionAsync(async () => {
    await writeTables(db, localCircleId, merged.tables);
    await replacePushMap(db, merged.pushMap);
  });
  await alignSequences(db, merged.tables);
  await db.runAsync('UPDATE circles SET name = ? WHERE id = ?', snapshot.circleName, localCircleId);

  return merged;
}

export async function loadLocalTablesForPush(circleId: number): Promise<SyncTables> {
  return (await exportCircleData(circleId)) as unknown as SyncTables;
}
