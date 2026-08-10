import { Hono } from 'hono';

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

app.get('/health', (c) => c.json({ ok: true }));

export default app;
