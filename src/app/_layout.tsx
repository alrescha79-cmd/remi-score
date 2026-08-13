import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useIsDark, useThemeColor } from '@/lib/theme';
import { useSettingsStore } from '@/store/settingsStore';

function ThemeSync() {
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
  }, [theme]);
  return null;
}

export default function RootLayout() {
  const bg = useThemeColor('bg');
  const isDark = useIsDark();

  return (
    <SafeAreaProvider>
      <ThemeSync />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: bg }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: bg },
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
      </View>
    </SafeAreaProvider>
  );
}
