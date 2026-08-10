import AsyncStorage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePref = 'system' | 'light' | 'dark';
export type Lang = 'en' | 'id';
export type CloudSyncMode = 'off' | 'manual' | 'auto';

interface SettingsState {
  theme: ThemePref;
  lang: Lang;
  sheetWebhookUrl: string;
  lastSyncAt: string | null;
  cloudWorkerUrl: string;
  cloudSyncMode: CloudSyncMode;
  lastCloudSyncAt: string | null;
  shareCodes: Record<number, string>;
  setTheme: (theme: ThemePref) => void;
  setLang: (lang: Lang) => void;
  setSheetWebhookUrl: (url: string) => void;
  setLastSyncAt: (iso: string) => void;
  setCloudWorkerUrl: (url: string) => void;
  setCloudSyncMode: (mode: CloudSyncMode) => void;
  setLastCloudSyncAt: (iso: string) => void;
  setShareCode: (circleId: number, code: string) => void;
  removeShareCode: (circleId: number) => void;
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
    }),
    { name: 'remiscore-settings', storage: createJSONStorage(() => AsyncStorage) }
  )
);
