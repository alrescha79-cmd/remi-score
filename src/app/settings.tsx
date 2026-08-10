import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CloudSyncSection from '@/components/CloudSyncSection';
import ScreenHeader from '@/components/ScreenHeader';
import SheetSyncSection from '@/components/SheetSyncSection';
import { useT } from '@/lib/i18n';
import { useSettingsStore, type Lang, type ThemePref } from '@/store/settingsStore';

const THEMES: { value: ThemePref; icon: keyof typeof Ionicons.glyphMap; key: string }[] = [
  { value: 'system', icon: 'phone-portrait-outline', key: 'settings.system' },
  { value: 'light', icon: 'sunny-outline', key: 'settings.light' },
  { value: 'dark', icon: 'moon-outline', key: 'settings.dark' },
];

const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Indonesia' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const t = useT();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const lang = useSettingsStore((s) => s.lang);
  const setLang = useSettingsStore((s) => s.setLang);

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top', 'bottom']}>
      <ScreenHeader title={t('settings.title')} onBack={() => router.back()} />

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="mb-6 mt-2 rounded-2xl border border-rule bg-surface-alt p-4 shadow-soft dark:border-rule-dark dark:bg-surface-dark-alt dark:shadow-none">
          <Text className="text-sm font-extrabold text-ink dark:text-ink-dark">{t('settings.theme')}</Text>
          <Text className="mb-3 mt-0.5 text-xs text-ink-muted dark:text-ink-dark-muted">{t('settings.themeHint')}</Text>
          <View className="flex-row rounded-xl bg-surface-fill p-1.5 dark:bg-surface-dark-fill">
            {THEMES.map((o) => {
              const active = theme === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => setTheme(o.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg py-2.5 ${
                    active ? 'bg-accent dark:bg-accent-dark' : 'bg-transparent'
                  }`}
                >
                  <Ionicons
                    name={o.icon}
                    size={16}
                    color={active ? '#ffffff' : undefined}
                    className={active ? 'text-white' : 'text-ink-muted dark:text-ink-dark-muted'}
                  />
                  <Text className={`text-sm font-bold ${active ? 'text-white' : 'text-ink-muted dark:text-ink-dark-muted'}`}>
                    {t(o.key)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mb-6 rounded-2xl border border-rule bg-surface-alt p-4 shadow-soft dark:border-rule-dark dark:bg-surface-dark-alt dark:shadow-none">
          <Text className="text-sm font-extrabold text-ink dark:text-ink-dark">{t('settings.language')}</Text>
          <Text className="mb-3 mt-0.5 text-xs text-ink-muted dark:text-ink-dark-muted">{t('settings.langHint')}</Text>
          <View className="flex-row rounded-xl bg-surface-fill p-1.5 dark:bg-surface-dark-fill">
            {LANGS.map((o) => {
              const active = lang === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => setLang(o.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg py-2.5 ${
                    active ? 'bg-accent dark:bg-accent-dark' : 'bg-transparent'
                  }`}
                >
                  <Ionicons
                    name="language-outline"
                    size={16}
                    color={active ? '#ffffff' : undefined}
                    className={active ? 'text-white' : 'text-ink-muted dark:text-ink-dark-muted'}
                  />
                  <Text className={`text-sm font-bold ${active ? 'text-white' : 'text-ink-muted dark:text-ink-dark-muted'}`}>
                    {o.label}
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
