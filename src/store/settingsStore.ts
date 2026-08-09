import AsyncStorage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePref = 'system' | 'light' | 'dark';
export type Lang = 'en' | 'id';

interface SettingsState {
  theme: ThemePref;
  lang: Lang;
  sheetWebhookUrl: string;
  lastSyncAt: string | null;
  setTheme: (theme: ThemePref) => void;
  setLang: (lang: Lang) => void;
  setSheetWebhookUrl: (url: string) => void;
  setLastSyncAt: (iso: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      lang: 'en',
      sheetWebhookUrl: '',
      lastSyncAt: null,
      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
      setSheetWebhookUrl: (sheetWebhookUrl) => set({ sheetWebhookUrl }),
      setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
    }),
    { name: 'remiscore-settings', storage: createJSONStorage(() => AsyncStorage) }
  )
);
