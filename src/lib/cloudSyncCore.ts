export const DEFAULT_CLOUD_WORKER_URL = 'https://kopek.cakson.my.id';

export function generateShareCode(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function validateShareCode(code: string): boolean {
  return /^[a-z2-9]{6}$/.test(code);
}

export type SyncTableName = 'players' | 'sessions' | 'rounds' | 'scores' | 'session_players';

export interface SyncRow {
  [key: string]: string | number | null;
}

export interface SyncTables {
  players: SyncRow[];
  sessions: SyncRow[];
  rounds: SyncRow[];
  scores: SyncRow[];
  session_players: SyncRow[];
}

export interface CloudSyncPayload {
  shareCode: string;
  circleId: number;
  circleName: string;
  baseSyncedAt: string | null;
  tables: SyncTables;
}

export interface CloudSnapshot {
  shareCode: string;
  circleId: number;
  circleName: string;
  syncedAt: string;
  tables: SyncTables;
}

/** Server sends the five tables at the top level, not nested under `tables`. */
export function decodeSnapshot(body: Record<string, unknown>): CloudSnapshot {
  return {
    shareCode: body.shareCode as string,
    circleId: body.circleId as number,
    circleName: body.circleName as string,
    syncedAt: body.syncedAt as string,
    tables: {
      players: (body.players ?? []) as SyncTables['players'],
      sessions: (body.sessions ?? []) as SyncTables['sessions'],
      rounds: (body.rounds ?? []) as SyncTables['rounds'],
      scores: (body.scores ?? []) as SyncTables['scores'],
      session_players: (body.session_players ?? []) as SyncTables['session_players'],
    },
  };
}

export interface SyncIdMapEntry {
  table: SyncTableName;
  localId: number;
  remoteId: number;
}

export interface MergeInput {
  local: SyncTables;
  remote: SyncTables;
  pushMap: SyncIdMapEntry[];
  /** All ids currently used per table across the whole local DB (every circle). */
  takenIds: Record<SyncTableName, Set<number>>;
  /**
   * True when the remote snapshot changed since our last sync (i.e. another
   * device pushed). When false, any local-vs-remote difference is a LOCAL
   * edit that must win so it gets pushed instead of being reverted.
   */
  remoteChanged: boolean;
}

export interface MergeResult {
  tables: SyncTables;
  pushMap: SyncIdMapEntry[];
}

const TABLE_ORDER: SyncTableName[] = ['players', 'sessions', 'rounds', 'scores', 'session_players'];

// Foreign-key columns per table (references into the same snapshot).
const FK_COLS: Record<SyncTableName, string[]> = {
  players: [],
  sessions: [],
  rounds: ['session_id'],
  scores: ['round_id', 'player_id'],
  session_players: ['session_id', 'player_id'],
};

const FK_TARGET: Record<string, SyncTableName> = {
  session_id: 'sessions',
  player_id: 'players',
  round_id: 'rounds',
};

// Composite natural keys for tables whose logical identity is not `id`.
const NATURAL_KEYS: Partial<Record<SyncTableName, string[]>> = {
  rounds: ['session_id', 'round_number'],
  scores: ['round_id', 'player_id'],
  session_players: ['session_id', 'player_id'],
};

function normVal(v: string | number | null): string | number | null {
  if (typeof v === 'string') {
    const ms = Date.parse(v);
    if (Number.isFinite(ms)) return ms;
  }
  return v;
}

function canonical(row: SyncRow): string {
  const { id: _id, circle_id: _c, ...rest } = row;
  return JSON.stringify(Object.keys(rest).sort().map((k) => [k, normVal(rest[k])]));
}

function naturalKey(table: SyncTableName, row: SyncRow): string {
  const cols = NATURAL_KEYS[table] ?? [];
  return cols.map((k) => `${k}=${row[k]}`).join('|');
}

function nextFree(used: Set<number>): number {
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

function buildMaps(
  pushMap: SyncIdMapEntry[]
): { localToRemote: Record<SyncTableName, Map<number, number>>; remoteToLocal: Record<SyncTableName, Map<number, number>> } {
  const localToRemote = { players: new Map(), sessions: new Map(), rounds: new Map(), scores: new Map(), session_players: new Map() } as Record<SyncTableName, Map<number, number>>;
  const remoteToLocal = { players: new Map(), sessions: new Map(), rounds: new Map(), scores: new Map(), session_players: new Map() } as Record<SyncTableName, Map<number, number>>;
  for (const e of pushMap) {
    localToRemote[e.table].set(e.localId, e.remoteId);
    remoteToLocal[e.table].set(e.remoteId, e.localId);
  }
  return { localToRemote, remoteToLocal };
}

function upsertMapEntry(pushMap: SyncIdMapEntry[], entry: SyncIdMapEntry): void {
  const idx = pushMap.findIndex((e) => e.table === entry.table && e.localId === entry.localId);
  if (idx >= 0) pushMap[idx] = entry;
  else pushMap.push(entry);
}

function dropMapEntry(pushMap: SyncIdMapEntry[], table: SyncTableName, localId: number): void {
  const idx = pushMap.findIndex((e) => e.table === table && e.localId === localId);
  if (idx >= 0) pushMap.splice(idx, 1);
}

/**
 * Merge a remote snapshot into local circle data. Operates in the LOCAL id
 * space, keeping both sides' rows so no data is lost:
 *
 * - rows present on both sides with identical content -> dedupe (remote wins)
 * - same id but different content on id-keyed tables (players/sessions) ->
 *   keep BOTH by remapping the local row to a fresh id (the two devices each
 *   created a different entity that collided)
 * - composite-keyed rows (rounds/scores/session_players) -> merge by natural
 *   key, remote wins, and FK references to a replaced row are rewritten
 * - local-only rows are kept, remote-only rows are inserted
 */
export function mergeSnapshots(input: MergeInput): MergeResult {
  const { local, remote, remoteChanged } = input;
  const pushMap = [...input.pushMap];
  const { remoteToLocal } = buildMaps(pushMap);

  const used = {} as Record<SyncTableName, Set<number>>;
  for (const table of TABLE_ORDER) {
    used[table] = new Set(input.takenIds[table]);
  }

  // Id-keyed tables: players, sessions. Keep both on id + content conflict.
  const localRemap: Partial<Record<SyncTableName, Map<number, number>>> = {
    players: new Map(),
    sessions: new Map(),
    rounds: new Map(),
  };

  // Where each remote row was placed (remoteId -> localId), used to translate
  // FK references of later remote rows.
  const placement = { players: new Map(), sessions: new Map(), rounds: new Map(), scores: new Map(), session_players: new Map() } as Record<SyncTableName, Map<number, number>>;

  const result = { players: [], sessions: [], rounds: [], scores: [], session_players: [] } as SyncTables;

  const toLocal = (table: SyncTableName, id: number): number => remoteToLocal[table].get(id) ?? id;

  for (const table of ['players', 'sessions'] as const) {
    const rows = [...local[table]];
    const byId = new Map<number, SyncRow>(rows.map((r) => [r.id as number, r]));
    for (const row of local[table]) used[table].add(row.id as number);

    for (const rem of remote[table]) {
      const remId = rem.id as number;
      const locId = toLocal(table, remId);
      const existing = byId.get(locId);
      let placedId: number;

      if (existing) {
        if (canonical(existing) === canonical(rem)) {
          const idx = rows.indexOf(existing);
          rows[idx] = { ...rem, id: locId };
          placedId = locId;
        } else {
          const localWins =
            !remoteChanged ||
            (table === 'sessions' && existing.status === 'completed' && rem.status === 'active');
          if (!localWins) {
            const idx = rows.indexOf(existing);
            rows[idx] = { ...rem, id: locId };
            byId.set(locId, rows[idx]);
          }
          placedId = locId;
        }
      } else if (used[table].has(locId)) {
        const fresh = nextFree(used[table]);
        used[table].add(fresh);
        upsertMapEntry(pushMap, { table, localId: fresh, remoteId: remId });
        rows.push({ ...rem, id: fresh });
        byId.set(fresh, rows[rows.length - 1]);
        placedId = fresh;
      } else {
        used[table].add(locId);
        rows.push({ ...rem, id: locId });
        byId.set(locId, rows[rows.length - 1]);
        placedId = locId;
      }
      placement[table].set(remId, placedId);
    }
    result[table] = rows;
  }

  // Composite-keyed tables: rounds -> scores -> session_players (FK order).
  const applyRemap = (table: SyncTableName, id: number): number => {
    const m = localRemap[table];
    return m ? (m.get(id) ?? id) : id;
  };
  const refToLocal = (table: SyncTableName, remoteId: number): number =>
    placement[table].get(remoteId) ?? remoteId;

  for (const table of ['rounds', 'scores', 'session_players'] as const) {
    const hasId = table !== 'session_players';
    const rows: SyncRow[] = [...local[table]].map((r): SyncRow => ({
      ...r,
      ...(FK_COLS[table].includes('session_id')
        ? { session_id: applyRemap('sessions', r.session_id as number) }
        : {}),
      ...(FK_COLS[table].includes('player_id')
        ? { player_id: applyRemap('players', r.player_id as number) }
        : {}),
      ...(FK_COLS[table].includes('round_id') ? { round_id: applyRemap('rounds', r.round_id as number) } : {}),
    }));
    const byKey = new Map<string, SyncRow>();
    for (const r of rows) {
      byKey.set(naturalKey(table, r), r);
      if (hasId) used[table].add(r.id as number);
    }

    for (const rem of remote[table]) {
      const remId = hasId ? (rem.id as number) : 0;
      const translated: SyncRow = {
        ...rem,
        ...(FK_COLS[table].includes('session_id') ? { session_id: refToLocal('sessions', rem.session_id as number) } : {}),
        ...(FK_COLS[table].includes('player_id') ? { player_id: refToLocal('players', rem.player_id as number) } : {}),
        ...(FK_COLS[table].includes('round_id') ? { round_id: refToLocal('rounds', rem.round_id as number) } : {}),
      };
      const key = naturalKey(table, translated);
      const existing = byKey.get(key);
      let placedId = 0;

      if (existing) {
        const existingId = hasId ? (existing.id as number) : 0;
        if (existingId === remId && canonical(existing) === canonical(rem)) {
          const idx = rows.indexOf(existing);
          rows[idx] = hasId ? { ...translated, id: existingId } : translated;
          placedId = existingId;
        } else if (!remoteChanged) {
          // Local wins when remote is unchanged since last sync (local edit/update).
          placedId = existingId;
        } else {
          // Remote wins. If the surviving row changes id, rewrite references.
          const locId = hasId ? toLocal(table, remId) : 0;
          placedId = !used[table].has(locId) || locId === existingId ? locId : nextFree(used[table]);
          if (hasId) {
            if (placedId !== existingId && table === 'rounds') {
              localRemap.rounds!.set(existingId, placedId);
            }
            if (placedId !== existingId) {
              dropMapEntry(pushMap, table, existingId);
            }
            if (placedId !== remId && placedId !== existingId) {
              upsertMapEntry(pushMap, { table, localId: placedId, remoteId: remId });
            }
            used[table].add(placedId);
          }
          const idx = rows.indexOf(existing);
          rows[idx] = hasId ? { ...translated, id: placedId } : translated;
          byKey.set(key, rows[idx]);
        }
      } else {
        const locId = hasId ? toLocal(table, remId) : 0;
        placedId = used[table].has(locId) ? nextFree(used[table]) : locId;
        if (hasId) {
          used[table].add(placedId);
          if (placedId !== remId) {
            upsertMapEntry(pushMap, { table, localId: placedId, remoteId: remId });
          }
        }
        const row = hasId ? { ...translated, id: placedId } : translated;
        rows.push(row);
        byKey.set(key, row);
      }
      if (hasId) placement[table].set(remId, placedId);
    }
    result[table] = rows;
  }

  return { tables: result, pushMap };
}

/**
 * Translate local rows (local id space) into remote id space for pushing.
 * Rows without a map entry keep their id (shared id space) or are locally
 * created rows with ids above the remote max.
 */
export function translateForPush(tables: SyncTables, pushMap: SyncIdMapEntry[], circleId: number): SyncTables {
  const { localToRemote } = buildMaps(pushMap);
  const out = { players: [], sessions: [], rounds: [], scores: [], session_players: [] } as SyncTables;
  for (const table of TABLE_ORDER) {
    out[table] = tables[table].map((row) => {
      const next: SyncRow = { ...row, id: localToRemote[table].get(row.id as number) ?? (row.id as number) };
      for (const col of FK_COLS[table]) {
        const target = FK_TARGET[col];
        next[col] = localToRemote[target].get(next[col] as number) ?? (next[col] as number);
      }
      return next;
    });
  }
  for (const row of out.players) row.circle_id = circleId;
  for (const row of out.sessions) row.circle_id = circleId;
  return out;
}
