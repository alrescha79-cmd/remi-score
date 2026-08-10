import { Hono } from 'hono';
import { ensureSchema, upsertCircle, type SyncPayload } from './db';

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

app.use('*', async (c, next) => {
  if (c.env.DB) {
    await ensureSchema(c.env.DB);
  }
  await next();
});

app.get('/health', (c) => c.json({ ok: true }));

app.post('/api/sync', async (c) => {
  let payload: SyncPayload;
  try {
    payload = await c.req.json<SyncPayload>();
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400);
  }

  if (!payload.shareCode || !payload.circleId || !payload.tables) {
    return c.json({ ok: false, error: 'missing_fields' }, 400);
  }

  try {
    await upsertCircle(c.env.DB, payload);
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : 'db_error' }, 500);
  }
});

export default app;
