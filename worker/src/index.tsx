import { Hono } from 'hono';
import { ensureSchema } from './db';

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

app.use('*', async (c, next) => {
  if (c.env.DB) {
    await ensureSchema(c.env.DB);
  }
  await next();
});

app.get('/health', (c) => c.json({ ok: true }));

export default app;
