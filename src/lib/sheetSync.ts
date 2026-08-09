const TIMEOUT_MS = 30000;

interface SheetResponse {
  body: string;
}

function extractError(html: string): string | null {
  const m = html.match(/<div class="errorMessage"[^>]*>([\s\S]*?)<\/div>/);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function request(url: string, init?: RequestInit): Promise<SheetResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const body = await res.text();
    if (body.trimStart().startsWith('<')) {
      const msg = extractError(body);
      if (msg) throw new Error(`sync.scriptError:${msg}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { body };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('sync.timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function pushBackup(url: string, payload: unknown): Promise<void> {
  const { body } = await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let res: { ok?: boolean; error?: string };
  try {
    res = JSON.parse(body);
  } catch {
    throw new Error('sync.badResponse');
  }
  if (!res.ok) throw new Error(res.error ?? 'sync.pushFailed');
}

export async function fetchBackup(url: string): Promise<string> {
  const { body } = await request(url, { method: 'GET' });
  return body;
}

export async function testConnection(url: string): Promise<void> {
  await request(url, { method: 'GET' });
}
