import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CloudSyncSection from '@/components/CloudSyncSection';
import ScreenHeader from '@/components/ScreenHeader';
import SheetSyncSection from '@/components/SheetSyncSection';
import { useT } from '@/lib/i18n';
import { useThemeColor } from '@/lib/theme';
import { useSettingsStore, type Lang, type ThemePref } from '@/store/settingsStore';

const THEMES: { value: ThemePref; icon: keyof typeof Ionicons.glyphMap; key: string }[] = [
  { value: 'system', icon: 'phone-portrait-outline', key: 'settings.system' },
  { value: 'light', icon: 'sunny-outline', key: 'settings.light' },
  { value: 'dark', icon: 'moon-outline', key: 'settings.dark' },
];

const LANGS: { value: Lang; key: string }[] = [
  { value: 'en', key: 'settings.english' },
  { value: 'id', key: 'settings.indonesia' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const t = useT();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const lang = useSettingsStore((s) => s.lang);
  const setLang = useSettingsStore((s) => s.setLang);

  const bg = useThemeColor('bg');
  const surface = useThemeColor('surface');
  const surfaceElevated = useThemeColor('surfaceElevated');
  const ink = useThemeColor('ink');
  const inkMuted = useThemeColor('inkMuted');
  const border = useThemeColor('border');
  const primary = useThemeColor('primary');
  const primaryInk = useThemeColor('primaryInk');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'bottom']}>
      <ScreenHeader title={t('settings.title')} onBack={() => router.back()} />

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="mb-6 mt-2 rounded-brutal-lg border-2 p-4 shadow-brutal-1" style={{ borderColor: border, backgroundColor: surface }}>
          <Text className="text-sm font-extrabold" style={{ color: ink }}>{t('settings.theme')}</Text>
          <Text className="mb-3 mt-0.5 text-xs" style={{ color: inkMuted }}>{t('settings.themeHint')}</Text>
          <View className="flex-row rounded-brutal p-1.5" style={{ backgroundColor: surfaceElevated }}>
            {THEMES.map((o) => {
              const active = theme === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => setTheme(o.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-brutal py-2.5"
                  style={active ? { backgroundColor: primary, borderWidth: 2, borderColor: border } : { borderWidth: 2, borderColor: 'transparent' }}
                >
                  <Ionicons
                    name={o.icon}
                    size={16}
                    color={active ? primaryInk : inkMuted}
                  />
                  <Text className="text-sm font-bold" style={{ color: active ? primaryInk : inkMuted }}>
                    {t(o.key)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mb-6 rounded-brutal-lg border-2 p-4 shadow-brutal-1" style={{ borderColor: border, backgroundColor: surface }}>
          <Text className="text-sm font-extrabold" style={{ color: ink }}>{t('settings.language')}</Text>
          <Text className="mb-3 mt-0.5 text-xs" style={{ color: inkMuted }}>{t('settings.langHint')}</Text>
          <View className="flex-row rounded-brutal p-1.5" style={{ backgroundColor: surfaceElevated }}>
            {LANGS.map((o) => {
              const active = lang === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => setLang(o.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-brutal py-2.5"
                  style={active ? { backgroundColor: primary, borderWidth: 2, borderColor: border } : { borderWidth: 2, borderColor: 'transparent' }}
                >
                  <Ionicons
                    name="language-outline"
                    size={16}
                    color={active ? primaryInk : inkMuted}
                  />
                  <Text className="text-sm font-bold" style={{ color: active ? primaryInk : inkMuted }}>
                    {t(o.key)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <CloudSyncSection />
        <SheetSyncSection />
      </ScrollView>
    </SafeAreaView>
  );
}
