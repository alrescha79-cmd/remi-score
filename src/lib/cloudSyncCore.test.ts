import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  decodeSnapshot,
  generateShareCode,
  mergeSnapshots,
  translateForPush,
  validateShareCode,
  type MergeInput,
  type SyncIdMapEntry,
  type SyncRow,
  type SyncTables,
} from './cloudSyncCore.ts';

function tables(over: Partial<SyncTables> = {}): SyncTables {
  return {
    players: [],
    sessions: [],
    rounds: [],
    scores: [],
    session_players: [],
    ...over,
  };
}

function player(id: number, name: string): SyncRow {
  return { id, name, circle_id: 5, created_at: '2026-01-01T00:00:00.000Z' };
}

function session(id: number, label: string | null, status = 'active'): SyncRow {
  return { id, circle_id: 5, label, status, created_at: '2026-01-01T00:00:00.000Z', completed_at: null };
}

function round(id: number, sessionId: number, roundNumber: number): SyncRow {
  return { id, session_id: sessionId, round_number: roundNumber, timestamp: '2026-01-01T00:00:00.000Z' };
}

function score(id: number, roundId: number, playerId: number, change: number): SyncRow {
  return { id, round_id: roundId, player_id: playerId, score_change: change, cumulative_total: change };
}

function sp(sessionId: number, playerId: number): SyncRow {
  return { session_id: sessionId, player_id: playerId, is_active: 1 };
}

function input(over: Partial<MergeInput>): MergeInput {
  return {
    local: tables(),
    remote: tables(),
    pushMap: [],
    takenIds: {
      players: new Set(),
      sessions: new Set(),
      rounds: new Set(),
      scores: new Set(),
      session_players: new Set(),
    },
    remoteChanged: false,
    ...over,
  };
}

describe('generateShareCode', () => {
  it('produces 6-char lowercase alphanumeric code', () => {
    const code = generateShareCode();
    assert.equal(code.length, 6);
    assert.ok(validateShareCode(code), `invalid code: ${code}`);
  });

  it('excludes ambiguous chars (0, 1, o, l)', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateShareCode();
      assert.ok(!/[01ol]/.test(code), `ambiguous char in: ${code}`);
    }
  });
});

describe('validateShareCode', () => {
  it('accepts 6 chars from the alphabet', () => {
    assert.ok(validateShareCode('abc234'));
    assert.ok(validateShareCode('z2x9c8'));
  });
  it('rejects wrong length or illegal chars', () => {
    assert.ok(!validateShareCode('abc23'));
    assert.ok(!validateShareCode('ABC234'));
    assert.ok(!validateShareCode('abc23!'));
    assert.ok(!validateShareCode('ab c23'));
  });
});

describe('decodeSnapshot', () => {
  it('reads the five tables from the top level (server shape)', () => {
    const out = decodeSnapshot({
      shareCode: 'gvqxda',
      circleId: 2,
      circleName: 'Kopek',
      syncedAt: '2026-08-10T10:42:35.343Z',
      players: [player(6, 'Ipan')],
      sessions: [session(3, null)],
      rounds: [round(7, 3, 1)],
      scores: [score(25, 7, 6, 10)],
      session_players: [sp(3, 6)],
    });
    assert.equal(out.shareCode, 'gvqxda');
    assert.equal(out.circleId, 2);
    assert.equal(out.tables.players.length, 1);
    assert.equal(out.tables.players[0].name, 'Ipan');
    assert.equal(out.tables.sessions[0].id, 3);
    assert.equal(out.tables.rounds[0].session_id, 3);
    assert.equal(out.tables.scores[0].player_id, 6);
    assert.equal(out.tables.session_players.length, 1);
  });

  it('defaults missing tables to empty arrays', () => {
    const out = decodeSnapshot({ shareCode: 'a', circleId: 1, circleName: '', syncedAt: 'x' });
    for (const t of ['players', 'sessions', 'rounds', 'scores', 'session_players'] as const) {
      assert.deepEqual(out.tables[t], []);
    }
  });
});

describe('mergeSnapshots', () => {
  it('inserts remote-only rows (fresh join)', () => {
    const remote = tables({
      players: [player(1, 'Andi'), player(2, 'Budi')],
      sessions: [session(1, 'S1')],
      rounds: [round(1, 1, 1)],
      scores: [score(1, 1, 1, 100), score(2, 1, 2, 50)],
      session_players: [sp(1, 1), sp(1, 2)],
    });
    const { tables: out } = mergeSnapshots(input({ remote }));
    assert.deepEqual(out.players, remote.players);
    assert.deepEqual(out.sessions, remote.sessions);
    assert.deepEqual(out.rounds, remote.rounds);
    assert.deepEqual(out.scores, remote.scores);
    assert.deepEqual(out.session_players, remote.session_players);
  });

  it('keeps local-only rows and adds remote-only rows', () => {
    const local = tables({
      players: [player(1, 'Andi')],
      sessions: [session(1, 'S1')],
      rounds: [round(1, 1, 1)],
      scores: [score(1, 1, 1, 100)],
      session_players: [sp(1, 1)],
    });
    const remote = tables({
      players: [player(1, 'Andi'), player(2, 'Budi')],
      sessions: [session(1, 'S1'), session(2, 'S2')],
      rounds: [round(1, 1, 1), round(2, 2, 1)],
      scores: [score(1, 1, 1, 100), score(2, 2, 2, 50)],
      session_players: [sp(1, 1), sp(2, 2)],
    });
    const { tables: out } = mergeSnapshots(input({ local, remote }));
    assert.equal(out.players.length, 2);
    assert.equal(out.sessions.length, 2);
    assert.equal(out.rounds.length, 2);
    assert.equal(out.scores.length, 2);
    assert.equal(out.session_players.length, 2);
  });

  it('dedupes rows with same id and same content', () => {
    const local = tables({ players: [player(1, 'Andi')] });
    const remote = tables({ players: [player(1, 'Andi')] });
    const { tables: out } = mergeSnapshots(input({ local, remote }));
    assert.equal(out.players.length, 1);
    assert.equal(out.players[0].name, 'Andi');
  });

  it('local wins when content differs and remote unchanged since last sync (remoteChanged=false)', () => {
    const local = tables({ players: [player(1, 'Andi')] });
    const remote = tables({ players: [player(1, 'Budi')] });
    const { tables: out, pushMap } = mergeSnapshots(input({ local, remote, remoteChanged: false }));
    assert.equal(out.players.length, 1);
    assert.equal(out.players[0].name, 'Andi');
    assert.deepEqual(pushMap, []);
  });

  it('remote wins when remote changed since last sync (remoteChanged=true)', () => {
    const local = tables({ players: [player(1, 'Andi')] });
    const remote = tables({ players: [player(1, 'Budi')] });
    const { tables: out, pushMap } = mergeSnapshots(input({ local, remote, remoteChanged: true }));
    assert.equal(out.players.length, 1);
    assert.equal(out.players[0].name, 'Budi');
    assert.deepEqual(pushMap, []);
  });

  it('completed session always beats active even when remote changed', () => {
    const local = tables({ sessions: [session(1, null, 'completed')] });
    const remote = tables({ sessions: [session(1, null, 'active')] });
    const { tables: out } = mergeSnapshots(input({ local, remote, remoteChanged: true }));
    assert.equal(out.sessions.length, 1);
    assert.equal(out.sessions[0].status, 'completed');
  });

  it('different circle_id + timestamp format do NOT cause doubling', () => {
    const local = tables({ players: [{ id: 1, name: 'Ipan', circle_id: 1, created_at: '2026-08-08 13:27:37' }] });
    const remote = tables({ players: [{ id: 1, name: 'Ipan', circle_id: 2, created_at: '2026-08-08T13:27:37.000Z' }] });
    const { tables: out } = mergeSnapshots(input({ local, remote, remoteChanged: true }));
    assert.equal(out.players.length, 1, 'must not duplicate player due to circle_id or timestamp format');
  });

  it('translateForPush never emits duplicate ids after merge conflict', () => {
    const local = tables({
      players: [player(1, 'Andi'), player(2, 'Budi')],
      sessions: [session(1, null, 'completed')],
    });
    const remote = tables({
      players: [player(1, 'Andi'), player(2, 'Bambang')],
      sessions: [session(1, null, 'active')],
    });
    const { tables: merged } = mergeSnapshots(input({ local, remote, remoteChanged: true }));
    const pushed = translateForPush(merged, [], 2);
    const playerIds = pushed.players.map((p) => p.id as number);
    const sessionIds = pushed.sessions.map((s) => s.id as number);
    assert.equal(new Set(playerIds).size, playerIds.length, 'no duplicate player ids');
    assert.equal(new Set(sessionIds).size, sessionIds.length, 'no duplicate session ids');
  });

  it('remaps a remote id already taken by another local circle', () => {
    const remote = tables({ players: [player(1, 'Budi')] });
    const { tables: out, pushMap } = mergeSnapshots(
      input({
        remote,
        takenIds: { players: new Set([1]), sessions: new Set(), rounds: new Set(), scores: new Set(), session_players: new Set() },
      })
    );
    assert.equal(out.players.length, 1);
    assert.notEqual(out.players[0].id, 1);
    assert.deepEqual(pushMap, [{ table: 'players', localId: out.players[0].id, remoteId: 1 }]);
  });

  it('merges composite-keyed rows by natural key, remote wins, FK remapped', () => {
    const local = tables({
      players: [player(1, 'Andi')],
      sessions: [session(1, 'S1')],
      rounds: [round(7, 1, 2)],
      scores: [score(7, 7, 1, 50)],
    });
    const remote = tables({
      players: [player(1, 'Andi')],
      sessions: [session(1, 'S1')],
      rounds: [round(10, 1, 2)],
      scores: [score(10, 10, 1, 80)],
    });
    const { tables: out } = mergeSnapshots(input({ local, remote }));
    assert.equal(out.rounds.length, 1);
    assert.equal(out.rounds[0].id, 10);
    assert.equal(out.scores.length, 1);
    assert.equal(out.scores[0].round_id, 10);
    assert.equal(out.scores[0].score_change, 80);
  });

  it('never writes session_players entries into the push map (no id column)', () => {
    const local = tables({ session_players: [sp(1, 1)] });
    const remote = tables({ session_players: [sp(1, 1), sp(1, 2)] });
    const { tables: out, pushMap } = mergeSnapshots(input({ local, remote }));
    assert.equal(out.session_players.length, 2);
    assert.equal(pushMap.filter((e) => e.table === 'session_players').length, 0);
  });
});

describe('translateForPush', () => {
  it('translates ids, FK references and circle_id into remote space', () => {
    const local = tables({
      players: [player(2, 'Andi'), player(3, 'Budi')],
      sessions: [session(4, 'S1')],
      rounds: [round(5, 4, 1)],
      scores: [score(6, 5, 2, 100)],
      session_players: [sp(4, 3)],
    });
    const pushMap: SyncIdMapEntry[] = [{ table: 'players', localId: 2, remoteId: 1 }];
    const out = translateForPush(local, pushMap, 42);
    assert.equal(out.players[0].id, 1);
    assert.equal(out.players[0].circle_id, 42);
    assert.equal(out.players[1].id, 3);
    assert.equal(out.scores[0].player_id, 1);
    assert.equal(out.session_players[0].player_id, 3);
    assert.equal(out.sessions[0].circle_id, 42);
    assert.equal(out.rounds[0].session_id, 4);
  });
});
