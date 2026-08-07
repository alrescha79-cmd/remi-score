import AsyncStorage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePref = 'system' | 'light' | 'dark';
export type Lang = 'en' | 'id';

interface SettingsState {
  theme: ThemePref;
  lang: Lang;
  setTheme: (theme: ThemePref) => void;
  setLang: (lang: Lang) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      lang: 'en',
      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
    }),
    { name: 'remiscore-settings', storage: createJSONStorage(() => AsyncStorage) }
  )
);
