import {
  getPushMap,
  loadLocalTablesForPush,
  syncCircleFromSnapshot,
} from '../db/cloudSyncRepo';
import type { CloudSnapshot, CloudSyncPayload } from './cloudSyncCore';
import { translateForPush } from './cloudSyncCore';

const TIMEOUT_MS = 10000;

function isEmptyJson(text: string): boolean {
  return text.trim().length === 0;
}

async function fetchJsonOnce(url: string, init?: RequestInit): Promise<{ status: number; body: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let body: any = {};
    if (!isEmptyJson(text)) {
      try {
        body = JSON.parse(text);
      } catch {
        const head = text.slice(0, 200);
        console.error('[CloudSync] Non-JSON response status', res.status, 'body:', head);
        throw new Error('cloud.badResponse');
      }
    }
    return { status: res.status, body };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('cloud.timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch JSON with one retry. Mobile networks and dual-stack (IPv4+IPv6)
 * connections race or drop the first attempt; a single retry recovers both.
 */
async function fetchJson(url: string, init?: RequestInit): Promise<{ status: number; body: any }> {
  try {
    return await fetchJsonOnce(url, init);
  } catch (first) {
    const msg = first instanceof Error ? first.message : '';
    // Do not retry semantic failures the server already answered.
    for (const code of ['codeNotFound', 'invalidCode', 'badResponse']) {
      if (msg.includes(code)) throw first;
    }
    // Timeout on a dual-stack (IPv4+IPv6) name usually means the device sat on
    // dead IPv6; retry so IPv4 gets picked. 10s abort + retry = ~20s worst case.
    console.log(`[CloudSync] Retrying (${msg}):`, url);
    return await fetchJsonOnce(url, init);
  }
}

export async function pushCloudSync(url: string, payload: CloudSyncPayload): Promise<string> {
  const endpoint = url.replace(/\/$/, '') + '/api/sync';
  console.log('[CloudSync] Pushing sync payload to:', endpoint);
  const { status, body } = await fetchJson(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  console.log('[CloudSync] Push response status:', status, body);
  if (status === 409) throw new Error('cloud.stale');
  if (status === 404) throw new Error('cloud.codeNotFound');
  if (!body?.ok) throw new Error(body?.error ?? 'cloud.pushFailed');
  return body.syncedAt as string;
}

export async function pullCloudSync(url: string, code: string): Promise<CloudSnapshot> {
  const endpoint = `${url.replace(/\/$/, '')}/api/circle?code=${encodeURIComponent(code)}`;
  console.log('[CloudSync] Pulling circle at:', endpoint);
  const { status, body } = await fetchJson(endpoint);
  console.log('[CloudSync] Pull response status:', status);
  if (status === 404) throw new Error('cloud.codeNotFound');
  if (status === 400) throw new Error('cloud.invalidCode');
  if (!body?.ok) throw new Error(body?.error ?? 'cloud.badResponse');
  return {
    shareCode: body.shareCode,
    circleId: body.circleId,
    circleName: body.circleName,
    syncedAt: body.syncedAt,
    tables: body.tables,
  };
}

export async function testCloudConnection(url: string): Promise<void> {
  const endpoint = url.replace(/\/$/, '') + '/health';
  console.log('[CloudSync] Testing health at:', endpoint);
  const { status } = await fetchJson(endpoint);
  if (status !== 200) throw new Error('cloud.badResponse');
}

export async function deleteCloudCircle(url: string, circleId: number): Promise<void> {
  const endpoint = `${url.replace(/\/$/, '')}/api/circle/${circleId}`;
  console.log('[CloudSync] Deleting cloud circle:', endpoint);
  try {
    const { status } = await fetchJson(endpoint, { method: 'DELETE' });
    console.log('[CloudSync] Delete response status:', status);
  } catch (err) {
    console.error('[CloudSync] deleteCloudCircle error:', err);
  }
}

interface SyncCircleOptions {
  url: string;
  /** Local circle id. */
  circleId: number;
  shareCode: string;
  circleName: string;
  /** Remote (worker) circle id. Falls back to local id for locally-created circles. */
  remoteCircleId?: number;
  getLastSyncedAt: () => string | null;
  setLastSyncedAt: (syncedAt: string) => void;
  maxAttempts?: number;
}

/**
 * Bidirectional sync for a circle: pull latest -> merge into local ->
 * translate ids -> push. On a stale push (409) it pulls again and retries,
 * so a lagging device can never clobber newer data.
 */
export async function syncCircleToCloud(opts: SyncCircleOptions): Promise<void> {
  const { url, circleId, shareCode, circleName, remoteCircleId } = opts;
  const maxAttempts = opts.maxAttempts ?? 2;
  let lastSyncedAt = opts.getLastSyncedAt();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const snapshot = await pullCloudSync(url, shareCode);
      await syncCircleFromSnapshot(circleId, snapshot);
      lastSyncedAt = snapshot.syncedAt;
      opts.setLastSyncedAt(lastSyncedAt);
    } catch (e) {
      // codeNotFound means this is a first-ever push (creator); nothing to pull.
      const msg = e instanceof Error ? e.message : '';
      if (msg !== 'cloud.codeNotFound') {
        console.error('[CloudSync] pull+merge failed:', msg);
      }
    }

    const tables = await loadLocalTablesForPush(circleId);
    const pushMap = await getPushMap();
    const remoteId = remoteCircleId ?? circleId;
    const translated = translateForPush(tables, pushMap, remoteId);

    try {
      const syncedAt = await pushCloudSync(url, {
        shareCode,
        circleId: remoteId,
        circleName,
        baseSyncedAt: lastSyncedAt,
        tables: translated,
      });
      opts.setLastSyncedAt(syncedAt);
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'cloud.stale' && attempt < maxAttempts - 1) continue;
      throw e;
    }
  }
  throw new Error('cloud.pushFailed');
}
