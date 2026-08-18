import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

const DB_NAME = 'remiscore.db';

const MIGRATIONS: string[] = [
  `
  PRAGMA foreign_keys = ON;

  CREATE TABLE circles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    label TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE TABLE rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (session_id, round_number)
  );

  CREATE TABLE scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    score_change INTEGER CHECK (score_change IS NULL OR score_change % 5 = 0),
    cumulative_total INTEGER NOT NULL,
    UNIQUE (round_id, player_id)
  );

  CREATE INDEX idx_scores_player ON scores(player_id);
  CREATE INDEX idx_scores_round ON scores(round_id);
  CREATE INDEX idx_rounds_session ON rounds(session_id);
  `,
  `
  CREATE TABLE session_players (
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    is_active INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (session_id, player_id)
  );
  `,
  `
  CREATE TABLE sync_id_map (
    table_name TEXT NOT NULL,
    local_id INTEGER NOT NULL,
    remote_id INTEGER NOT NULL,
    PRIMARY KEY (table_name, local_id)
  );
  `,
  `
  CREATE TABLE scores_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    score_change INTEGER CHECK (score_change IS NULL OR score_change % 5 = 0),
    cumulative_total INTEGER NOT NULL,
    UNIQUE (round_id, player_id)
  );
  INSERT INTO scores_new (id, round_id, player_id, score_change, cumulative_total)
    SELECT id, round_id, player_id, score_change, cumulative_total FROM scores;
  DROP TABLE scores;
  ALTER TABLE scores_new RENAME TO scores;
  CREATE INDEX idx_scores_player ON scores(player_id);
  CREATE INDEX idx_scores_round ON scores(round_id);

  UPDATE scores SET score_change = NULL
  WHERE id IN (
    SELECT sc.id FROM scores sc
    JOIN rounds r ON sc.round_id = r.id
    JOIN players p ON sc.player_id = p.id
    JOIN sessions s ON r.session_id = s.id
    WHERE p.name = 'Perdi' AND sc.score_change = 0 AND (
      s.id = 3
      OR (s.id = 4 AND r.round_number = 37)
      OR (s.id = 9 AND r.round_number >= 16)
    )
  );

  UPDATE scores SET score_change = NULL
  WHERE id IN (
    SELECT sc.id FROM scores sc
    JOIN rounds r ON sc.round_id = r.id
    JOIN players p ON sc.player_id = p.id
    JOIN sessions s ON r.session_id = s.id
    WHERE p.name = 'Bambang' AND s.id = 9 AND sc.score_change = 0
  );

  UPDATE scores SET score_change = NULL
  WHERE id IN (
    SELECT sc.id FROM scores sc
    JOIN rounds r ON sc.round_id = r.id
    JOIN players p ON sc.player_id = p.id
    JOIN sessions s ON r.session_id = s.id
    WHERE p.name = 'Dani' AND s.id = 9 AND r.round_number = 25 AND sc.score_change = 0
  );
  `,
  `
  ALTER TABLE scores ADD COLUMN is_edited INTEGER NOT NULL DEFAULT 0;
  `,
];

let dbPromise: Promise<SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then((db) => migrate(db).then(() => db));
  }
  return dbPromise;
}

async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;

  for (let i = current; i < MIGRATIONS.length; i++) {
    await db.execAsync(MIGRATIONS[i]);
    await db.execAsync(`PRAGMA user_version = ${i + 1};`);
  }
}
