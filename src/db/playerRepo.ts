import { getDb } from './database';
import type { Player } from './models';

export async function addPlayer(circleId: number, name: string): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync('INSERT INTO players (name, circle_id) VALUES (?, ?)', name.trim(), circleId);
  return result.lastInsertRowId;
}

export async function renamePlayer(id: number, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE players SET name = ? WHERE id = ?', name.trim(), id);
}

export async function deletePlayer(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM players WHERE id = ?', id);
}

export async function listPlayers(circleId: number): Promise<Player[]> {
  const db = await getDb();
  return db.getAllAsync<Player>('SELECT * FROM players WHERE circle_id = ? ORDER BY name ASC', circleId);
}
