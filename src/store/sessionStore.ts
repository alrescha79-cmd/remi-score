import { create } from 'zustand';
import type { Player, RoundEntry, ScoreRow } from '../db/models';
import { listPlayers } from '../db/playerRepo';
import { getCircle } from '../db/circleRepo';
import {
  addRound as repoAddRound,
  completeSession,
  getSession,
  listRoundScores,
  listSessionPlayers,
  setSessionPlayerActive,
} from '../db/sessionRepo';
import { syncCircleToCloud } from '../lib/cloudSync';
import { DEFAULT_CLOUD_WORKER_URL } from '../lib/cloudSyncCore';
import { computeTotals, rankByScore, type Ranked } from '../lib/score';
import { useSettingsStore } from './settingsStore';

interface SessionState {
  sessionId: number | null;
  circleId: number | null;
  label: string | null;
  players: Player[];
  scores: ScoreRow[];
  totals: Record<number, number>;
  ranking: Ranked<Player>[];
  active: Record<number, boolean>;
  loading: boolean;
  error: string | null;

  load: (sessionId: number) => Promise<void>;
  addRound: (entries: RoundEntry[]) => Promise<void>;
  setActive: (playerId: number, isActive: boolean) => Promise<void>;
  finish: () => Promise<void>;
}

function derive(players: Player[], scores: ScoreRow[]) {
  const totals = computeTotals(scores);
  const totalsObj = Object.fromEntries(totals);
  const ranking = rankByScore(players.map((p) => ({ item: p, score: totals.get(p.id) ?? 0 })));
  return { totals: totalsObj, ranking };
}

function fireCloudSync(circleId: number) {
  const { cloudWorkerUrl, cloudSyncMode, shareCodes, circleSyncMeta, setLastCloudSyncAt } =
    useSettingsStore.getState();
  const workerUrl = cloudWorkerUrl.trim() || DEFAULT_CLOUD_WORKER_URL;
  if (cloudSyncMode !== 'auto' || !shareCodes[circleId]) return;
  const shareCode = shareCodes[circleId];

  void (async () => {
    try {
      const circle = await getCircle(circleId);
      await syncCircleToCloud({
        url: workerUrl,
        circleId,
        shareCode,
        circleName: circle?.name ?? '',
        remoteCircleId: circleSyncMeta[circleId]?.remoteCircleId,
        getLastSyncedAt: () => useSettingsStore.getState().circleSyncMeta[circleId]?.lastSyncedAt ?? null,
        setLastSyncedAt: (syncedAt) => {
          const st = useSettingsStore.getState();
          st.setCircleSyncMeta(circleId, { ...st.circleSyncMeta[circleId], lastSyncedAt: syncedAt });
        },
      });
      setLastCloudSyncAt(new Date().toISOString());
    } catch (err) {
      console.error('[SessionStore] fireCloudSync failed:', err);
    }
  })();
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: null,
  circleId: null,
  label: null,
  players: [],
  scores: [],
  totals: {},
  ranking: [],
  active: {},
  loading: false,
  error: null,

  async load(sessionId) {
    set({ sessionId, loading: true, error: null });
    try {
      const session = await getSession(sessionId);
      if (!session) throw new Error('Session not found');
      const players = await listPlayers(session.circle_id);
      const scores = await listRoundScores(sessionId);
      const flags = await listSessionPlayers(sessionId);
      const active: Record<number, boolean> = {};
      for (const p of players) active[p.id] = flags.find((f) => f.player_id === p.id)?.is_active !== 0;
      set({
        circleId: session.circle_id,
        label: session.label,
        players,
        scores,
        active,
        ...derive(players, scores),
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load session' });
    }
  },

  async addRound(entries) {
    const { sessionId, players, circleId } = get();
    if (!sessionId) return;
    await repoAddRound(sessionId, entries);
    const scores = await listRoundScores(sessionId);
    set({ scores, ...derive(players, scores) });
    if (circleId) fireCloudSync(circleId);
  },

  async setActive(playerId, isActive) {
    const { sessionId } = get();
    if (!sessionId) return;
    await setSessionPlayerActive(sessionId, playerId, isActive);
    set((s) => ({ active: { ...s.active, [playerId]: isActive } }));
  },

  async finish() {
    const { sessionId, circleId } = get();
    if (!sessionId) return;
    await completeSession(sessionId);
    if (circleId) fireCloudSync(circleId);
  },
}));
