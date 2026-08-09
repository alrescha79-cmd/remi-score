import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSettingsStore } from '@/store/settingsStore';

const STACK_SCREEN_OPTIONS = {
  headerShown: false,
};

function ThemeSync() {
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
  }, [theme]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeSync />
      <StatusBar style="auto" />
      <Stack screenOptions={STACK_SCREEN_OPTIONS}>
        <Stack.Screen name="index" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="circle/[id]" />
        <Stack.Screen name="circle/[id]/player/[playerId]" />
        <Stack.Screen name="session/[id]" />
        <Stack.Screen name="session/[id]/add-round" options={{ presentation: 'modal' }} />
        <Stack.Screen name="session/[id]/player/[playerId]" />
      </Stack>
    </SafeAreaProvider>
  );
}
