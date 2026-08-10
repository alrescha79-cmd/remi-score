import type { CloudSyncPayload } from './cloudSyncCore';

const TIMEOUT_MS = 15000;

export async function pushCloudSync(url: string, payload: CloudSyncPayload): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const endpoint = url.replace(/\/$/, '') + '/api/sync';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (!body.ok) throw new Error(body.error ?? 'cloud.pushFailed');
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('cloud.timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function testCloudConnection(url: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const endpoint = url.replace(/\/$/, '') + '/health';
    const res = await fetch(endpoint, { signal: controller.signal });
    if (!res.ok) throw new Error('cloud.badResponse');
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('cloud.timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
