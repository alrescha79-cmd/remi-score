import type { CloudSyncPayload } from './cloudSyncCore';

const TIMEOUT_MS = 15000;

export async function pushCloudSync(url: string, payload: CloudSyncPayload): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const endpoint = url.replace(/\/$/, '') + '/api/sync';
    console.log('[CloudSync] Pushing sync payload to:', endpoint);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    console.log('[CloudSync] Push response status:', res.status);
    const text = await res.text();
    console.log('[CloudSync] Push response body:', text);
    let body: { ok?: boolean; error?: string } = {};
    try {
      body = JSON.parse(text);
    } catch {
      console.error('[CloudSync] Failed to parse JSON response:', text);
      throw new Error('cloud.badResponse');
    }
    if (!body.ok) throw new Error(body.error ?? 'cloud.pushFailed');
  } catch (err) {
    console.error('[CloudSync] pushCloudSync error:', err);
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
    console.log('[CloudSync] Testing health at:', endpoint);
    const res = await fetch(endpoint, { signal: controller.signal });
    console.log('[CloudSync] Health response status:', res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error('[CloudSync] Health check failed:', res.status, text);
      throw new Error('cloud.badResponse');
    }
  } catch (err) {
    console.error('[CloudSync] testCloudConnection error:', err);
    if (err instanceof Error && err.name === 'AbortError') throw new Error('cloud.timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function deleteCloudCircle(url: string, circleId: number): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const endpoint = `${url.replace(/\/$/, '')}/api/circle/${circleId}`;
    console.log('[CloudSync] Deleting cloud circle:', endpoint);
    const res = await fetch(endpoint, {
      method: 'DELETE',
      signal: controller.signal,
    });
    console.log('[CloudSync] Delete response status:', res.status);
  } catch (err) {
    console.error('[CloudSync] deleteCloudCircle error:', err);
  } finally {
    clearTimeout(timer);
  }
}
