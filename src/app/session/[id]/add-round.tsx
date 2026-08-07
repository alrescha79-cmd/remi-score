import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StepperRow from '@/components/StepperRow';
import { useSessionStore } from '@/store/sessionStore';
import { useT } from '@/lib/i18n';
import { formatSignedScore, validateScore } from '@/lib/score';

export default function AddRoundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);
  const router = useRouter();
  const t = useT();
  const { players, totals, scores, active, load, addRound, setActive } = useSessionStore();
  const [overrides, setOverrides] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load(sessionId);
  }, [sessionId, load]);

  const entries: Record<number, number> = {};
  for (const p of players) entries[p.id] = active[p.id] === false ? 0 : overrides[p.id] ?? 0;

  const setEntry = (playerId: number, value: number) =>
    setOverrides((prev) => ({ ...prev, [playerId]: value }));

  const roundNumber = scores.reduce((max, s) => Math.max(max, s.round_number), 0) + 1;
  const invalid = players.some((p) => active[p.id] !== false && !validateScore(entries[p.id]));

  const save = async () => {
    if (invalid) return;
    setSaving(true);
    try {
      await addRound(players.map((p) => ({ playerId: p.id, scoreChange: entries[p.id] })));
      router.back();
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('common.failedRound'));
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-4 pb-2 pt-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-surface-alt dark:bg-surface-dark-alt">
          <Ionicons name="close" size={22} color="#6b7280" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-ink dark:text-ink-dark">
            {t('round.title', { n: roundNumber })}
          </Text>
          <Text className="text-xs text-ink-muted dark:text-ink-dark-muted">{t('round.subtitle')}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 12 }}>
        {players.map((p) => {
          const isActive = active[p.id] !== false;
          return (
            <View key={p.id} className="mb-2">
              <TouchableOpacity
                onPress={() => setActive(p.id, !isActive)}
                className="mb-1 flex-row items-center px-1"
              >
                <Ionicons
                  name={isActive ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={isActive ? '#16a34a' : '#9aa3af'}
                />
                <Text
                  className={`ml-1.5 text-xs font-semibold ${
                    isActive ? 'text-good' : 'text-ink-muted dark:text-ink-dark-muted'
                  }`}
                >
                  {isActive ? t('round.playing') : t('round.absent')}
                </Text>
              </TouchableOpacity>
              {isActive ? (
                <StepperRow
                  name={p.name}
                  value={entries[p.id]}
                  onChange={(v) => setEntry(p.id, v)}
                  projectedTotal={(totals[p.id] ?? 0) + entries[p.id]}
                />
              ) : (
                <View className="flex-row items-center rounded-2xl bg-surface-alt px-4 py-3 opacity-60 dark:bg-surface-dark-alt">
                  <Text className="flex-1 text-base font-semibold text-ink dark:text-ink-dark">{p.name}</Text>
                  <Text className="text-xl font-bold tabular-nums text-ink-muted dark:text-ink-dark-muted">
                    {formatSignedScore(0)}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
        {invalid && (
          <Text className="mt-2 text-center text-sm font-semibold text-bad">{t('round.invalid')}</Text>
        )}
      </ScrollView>

      <View className="border-t border-ink/10 px-4 py-4 dark:border-ink-dark/10">
        <TouchableOpacity
          onPress={save}
          disabled={invalid || saving || players.length === 0}
          className="flex-row items-center justify-center rounded-2xl bg-accent py-4 disabled:opacity-40"
        >
          <Text className="text-base font-bold text-white">{saving ? t('round.saving') : t('round.save')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
