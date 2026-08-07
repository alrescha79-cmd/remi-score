import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSettingsStore } from '@/store/settingsStore';

export default function RootLayout() {
  const theme = useSettingsStore((s) => s.theme);
  const system = useColorScheme();
  const scheme = theme === 'system' ? system : theme;

  useEffect(() => {
    Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
  }, [theme]);

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: scheme === 'dark' ? '#0d0e11' : '#f4f5f7' },
        }}
      >
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
