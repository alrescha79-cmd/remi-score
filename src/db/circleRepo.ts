import { getDb } from './database';
import type { Circle, CircleWithStats } from './models';

export async function createCircle(name: string): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync('INSERT INTO circles (name) VALUES (?)', name.trim());
  return result.lastInsertRowId;
}

export async function renameCircle(id: number, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE circles SET name = ? WHERE id = ?', name.trim(), id);
}

export async function deleteCircle(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM circles WHERE id = ?', id);
}

export async function listCircles(): Promise<CircleWithStats[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Circle & { session_count: number; last_activity: string | null }>(
    `
    SELECT c.*,
      (SELECT COUNT(*) FROM sessions s WHERE s.circle_id = c.id) AS session_count,
      (SELECT MAX(created_at) FROM sessions s WHERE s.circle_id = c.id) AS last_activity
    FROM circles c
    ORDER BY c.created_at DESC
    `
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    created_at: r.created_at,
    stats: { sessionCount: r.session_count, lastActivityAt: r.last_activity },
  }));
}

export async function getCircle(id: number): Promise<Circle | null> {
  const db = await getDb();
  return db.getFirstAsync<Circle>('SELECT * FROM circles WHERE id = ?', id);
}
