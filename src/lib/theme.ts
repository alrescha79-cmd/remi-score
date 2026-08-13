import { useSettingsStore } from '@/store/settingsStore';
import { useColorScheme } from 'react-native';

const colors = {
  bg:              { light: '#f8fafc', dark: '#0b1120' },
  surface:         { light: '#ffffff', dark: '#131c2e' },
  surfaceElevated: { light: '#f1f5f9', dark: '#1e293b' },
  ink:             { light: '#1e293b', dark: '#f1f5f9' },
  inkMuted:        { light: '#4b5563', dark: '#94a3b8' },
  inkFaint:        { light: '#6b7280', dark: '#64748b' },
  border:          { light: '#1e293b', dark: '#334155' },
  primary:         { light: '#2563eb', dark: '#60a5fa' },
  primaryInk:      { light: '#ffffff', dark: '#0b1120' },
  good:            { light: '#16a34a', dark: '#4ade80' },
  goodInk:         { light: '#ffffff', dark: '#052e16' },
  bad:             { light: '#dc2626', dark: '#f87171' },
  badInk:          { light: '#ffffff', dark: '#450a0a' },
} as const;

type ColorKey = keyof typeof colors;

export function useThemeColor(key: ColorKey): string {
  const themePref = useSettingsStore((s) => s.theme);
  const systemScheme = useColorScheme();
  const scheme = themePref === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themePref;
  return colors[key][scheme];
}

export function useIsDark(): boolean {
  const themePref = useSettingsStore((s) => s.theme);
  const systemScheme = useColorScheme();
  const scheme = themePref === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themePref;
  return scheme === 'dark';
}
