import AsyncStorage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePref = 'system' | 'light' | 'dark';
export type Lang = 'en' | 'id';
export type CloudSyncMode = 'off' | 'manual' | 'auto';

export interface CircleSyncMeta {
  /** Remote (worker) circle id. Undefined for a locally-created circle. */
  remoteCircleId?: number;
  /** Revision timestamp of the last successful pull/merge/push. */
  lastSyncedAt: string | null;
}

interface SettingsState {
  theme: ThemePref;
  lang: Lang;
  sheetWebhookUrl: string;
  lastSyncAt: string | null;
  cloudWorkerUrl: string;
  cloudSyncMode: CloudSyncMode;
  lastCloudSyncAt: string | null;
  shareCodes: Record<number, string>;
  circleSyncMeta: Record<number, CircleSyncMeta>;
  setTheme: (theme: ThemePref) => void;
  setLang: (lang: Lang) => void;
  setSheetWebhookUrl: (url: string) => void;
  setLastSyncAt: (iso: string) => void;
  setCloudWorkerUrl: (url: string) => void;
  setCloudSyncMode: (mode: CloudSyncMode) => void;
  setLastCloudSyncAt: (iso: string) => void;
  setShareCode: (circleId: number, code: string) => void;
  removeShareCode: (circleId: number) => void;
  setCircleSyncMeta: (circleId: number, meta: CircleSyncMeta) => void;
  removeCircleSyncMeta: (circleId: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      lang: 'en',
      sheetWebhookUrl: '',
      lastSyncAt: null,
      cloudWorkerUrl: 'https://kopek.cakson.my.id',
      cloudSyncMode: 'off',
      lastCloudSyncAt: null,
      shareCodes: {},
      circleSyncMeta: {},
      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
      setSheetWebhookUrl: (sheetWebhookUrl) => set({ sheetWebhookUrl }),
      setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
      setCloudWorkerUrl: (cloudWorkerUrl) => set({ cloudWorkerUrl }),
      setCloudSyncMode: (cloudSyncMode) => set({ cloudSyncMode }),
      setLastCloudSyncAt: (lastCloudSyncAt) => set({ lastCloudSyncAt }),
      setShareCode: (circleId, code) =>
        set((s) => ({ shareCodes: { ...s.shareCodes, [circleId]: code } })),
      removeShareCode: (circleId) =>
        set((s) => {
          const next = { ...s.shareCodes };
          delete next[circleId];
          return { shareCodes: next };
        }),
      setCircleSyncMeta: (circleId, meta) =>
        set((s) => ({ circleSyncMeta: { ...s.circleSyncMeta, [circleId]: meta } })),
      removeCircleSyncMeta: (circleId) =>
        set((s) => {
          const next = { ...s.circleSyncMeta };
          delete next[circleId];
          return { circleSyncMeta: next };
        }),
    }),
    { name: 'remiscore-settings', storage: createJSONStorage(() => AsyncStorage) }
  )
);
