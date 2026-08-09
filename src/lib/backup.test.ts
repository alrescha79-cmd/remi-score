import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeBackup, parseBackup, BACKUP_VERSION } from './backupCore.ts';

test('serialize -> parse round-trips all tables', () => {
  const tables = {
    circles: [{ id: 1, name: 'Warkop', created_at: '2026-01-01T00:00:00.000Z' }],
    players: [{ id: 1, name: 'Budi', circle_id: 1, created_at: '2026-01-01T00:00:00.000Z' }],
    sessions: [
      { id: 1, circle_id: 1, label: null, status: 'completed' as const, created_at: '2026-01-02T00:00:00.000Z', completed_at: '2026-01-02T01:00:00.000Z' },
    ],
    rounds: [{ id: 1, session_id: 1, round_number: 1, timestamp: '2026-01-02T00:00:00.000Z' }],
    scores: [{ id: 1, round_id: 1, player_id: 1, score_change: 25, cumulative_total: 25 }],
    session_players: [{ session_id: 1, player_id: 1, is_active: 1 }],
  };

  const payload = serializeBackup(tables);
  assert.equal(payload.version, BACKUP_VERSION);
  assert.deepEqual(parseBackup(JSON.stringify(payload)).tables, tables);
});

test('parseBackup rejects invalid JSON', () => {
  assert.throws(() => parseBackup('not json'), /backup.invalidJson/);
});

test('parseBackup rejects wrong version or missing tables', () => {
  assert.throws(() => parseBackup('{"version":99,"exportedAt":"x","tables":{}}'), /backup.unsupported/);
  assert.throws(() => parseBackup('{"version":1,"exportedAt":"x","tables":{"circles":"nope"}}'), /backup.unsupported/);
});
