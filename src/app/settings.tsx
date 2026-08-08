import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { theme, setTheme, lang, setLang } = useSettingsStore();

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-4 pb-2 pt-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-surface-alt dark:bg-surface-dark-alt"
        >
          <Ionicons name="close" size={22} color="#6b7280" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-extrabold text-ink dark:text-ink-dark">{t('settings.title')}</Text>
      </View>

      <View className="flex-1 px-5">
        <View className="mb-6 mt-4">
          <Text className="text-sm font-semibold text-ink-muted dark:text-ink-dark-muted">{t('settings.theme')}</Text>
          <Text className="mb-2 text-xs text-ink-muted/70 dark:text-ink-dark-muted/70">{t('settings.themeHint')}</Text>
          <View className="flex-row rounded-2xl bg-surface-alt p-1 dark:bg-surface-dark-alt">
            {THEMES.map((o) => {
              const active = theme === o.value;
              return (
                <TouchableOpacity
                  key={o.value}
                  onPress={() => setTheme(o.value)}
                  className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
                    active ? 'bg-accent' : ''
                  }`}
                >
                  <Ionicons name={o.icon} size={16} color={active ? 'white' : '#9aa3af'} />
                  <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-ink-muted dark:text-ink-dark-muted'}`}>
                    {t(o.key)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View>
          <Text className="text-sm font-semibold text-ink-muted dark:text-ink-dark-muted">{t('settings.language')}</Text>
          <Text className="mb-2 text-xs text-ink-muted/70 dark:text-ink-dark-muted/70">{t('settings.langHint')}</Text>
          <View className="flex-row rounded-2xl bg-surface-alt p-1 dark:bg-surface-dark-alt">
            {LANGS.map((o) => {
              const active = lang === o.value;
              return (
                <TouchableOpacity
                  key={o.value}
                  onPress={() => setLang(o.value)}
                  className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
                    active ? 'bg-accent' : ''
                  }`}
                >
                  <Ionicons name="language-outline" size={16} color={active ? 'white' : '#9aa3af'} />
                  <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-ink-muted dark:text-ink-dark-muted'}`}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
