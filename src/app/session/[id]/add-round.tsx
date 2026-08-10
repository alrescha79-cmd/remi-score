import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmDialog, { type ConfirmDialogOptions } from '@/components/ConfirmDialog';
import ScreenHeader from '@/components/ScreenHeader';
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
  const [confirm, setConfirm] = useState<ConfirmDialogOptions | null>(null);

  useEffect(() => {
    load(sessionId);
  }, [sessionId, load]);

  const entries: Record<number, number> = {};
  for (const p of players) entries[p.id] = active[p.id] === false ? 0 : overrides[p.id] ?? 0;

  const setEntry = (playerId: number, value: number) =>
    setOverrides((prev) => ({ ...prev, [playerId]: value }));

  const roundNumber = scores.reduce((max, s) => Math.max(max, s.round_number), 0) + 1;
  const invalid = players.some((p) => active[p.id] !== false && !validateScore(entries[p.id]));

  // Auto-sort players: active players at top, absent players at bottom
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aActive = active[a.id] !== false;
      const bActive = active[b.id] !== false;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });
  }, [players, active]);

  const playingCount = players.filter((p) => active[p.id] !== false).length;

  const setAllActive = (isPlay: boolean) => {
    for (const p of players) {
      setActive(p.id, isPlay);
    }
  };

  const resetAllScores = () => {
    setOverrides({});
  };

  const save = async () => {
    if (invalid) return;
    setSaving(true);
    try {
      await addRound(players.map((p) => ({ playerId: p.id, scoreChange: entries[p.id] })));
      router.back();
    } catch (e) {
      setSaving(false);
      setConfirm({
        title: t('common.error'),
        message: e instanceof Error ? e.message : t('common.failedRound'),
        confirmText: t('common.ok'),
        hideCancel: true,
        icon: 'alert-circle-outline',
        iconTone: 'bad',
        onConfirm: () => {},
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top', 'bottom']}>
      <ScreenHeader
        compact
        title={t('round.title', { n: roundNumber })}
        onBack={() => router.back()}
      />

      {/* Top Helper & Batch Action Bar */}
      <View className="mx-4 mb-2.5 rounded-2xl border border-rule bg-surface-alt p-2.5 dark:border-rule-dark dark:bg-surface-dark-alt">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-extrabold text-ink dark:text-ink-dark">
            {t('round.playingCount', { playing: playingCount, total: players.length })}
          </Text>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setAllActive(true)}
              accessibilityRole="button"
              className="rounded-lg bg-surface-fill px-2.5 py-1.5 dark:bg-surface-dark-fill"
            >
              <Text className="text-xs font-bold text-accent-deep dark:text-accent-dark-deep">{t('round.allPlay')}</Text>
            </TouchableOpacity>
            {Object.keys(overrides).length > 0 && (
              <TouchableOpacity
                onPress={resetAllScores}
                accessibilityRole="button"
                className="rounded-lg bg-surface-fill px-2.5 py-1.5 dark:bg-surface-dark-fill"
              >
                <Text className="text-xs font-bold text-ink-muted dark:text-ink-dark-muted">{t('round.reset')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Player Cards */}
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 20 }}>
        {sortedPlayers.map((p) => {
          const isActive = active[p.id] !== false;
          const currentTotal = totals[p.id] ?? 0;
          const delta = entries[p.id];

          return (
            <View
              key={p.id}
              className={`mb-2.5 rounded-2xl border p-3 ${
                isActive
                  ? 'border-rule bg-surface-alt opacity-100 dark:border-rule-dark dark:bg-surface-dark-alt'
                  : 'border-rule/40 bg-surface-fill/30 opacity-60 dark:border-rule-dark/40 dark:bg-surface-dark-fill/20'
              }`}
            >
              {/* Header: Avatar + Name/Status + Segmented Toggle */}
              <View className="flex-row items-center justify-between">
                <View className="min-w-0 flex-1 flex-row items-center gap-2">
                  <View className={`h-8 w-8 shrink-0 items-center justify-center rounded-full ${isActive ? 'bg-accent-soft dark:bg-accent-dark-soft' : 'bg-surface-fill dark:bg-surface-dark-fill'}`}>
                    <Ionicons
                      name="person"
                      size={15}
                      className={isActive ? 'text-accent dark:text-accent-dark' : 'text-ink-faint dark:text-ink-dark-faint'}
                    />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className={`text-sm font-extrabold ${isActive ? 'text-ink dark:text-ink-dark' : 'text-ink-muted dark:text-ink-dark-muted'}`} numberOfLines={1}>
                      {p.name}
                    </Text>
                    {!isActive && (
                      <Text className="mt-0.5 text-[11px] font-bold text-ink-faint dark:text-ink-dark-faint" numberOfLines={1}>
                        {t('round.absentMsg', { total: formatSignedScore(currentTotal) })}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Segmented Toggle Pill (text only) */}
                <View className="ml-2 flex-row rounded-full bg-surface-fill p-0.5 dark:bg-surface-dark-fill">
                  <TouchableOpacity
                    onPress={() => setActive(p.id, true)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    className={`rounded-full px-2.5 py-1 ${isActive ? 'bg-good dark:bg-good-dark' : 'bg-transparent'}`}
                  >
                    <Text className={`text-xs font-extrabold ${isActive ? 'text-white' : 'text-ink-muted dark:text-ink-dark-muted'}`}>
                      {t('round.play')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActive(p.id, false)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: !isActive }}
                    className={`rounded-full px-2.5 py-1 ${!isActive ? 'bg-bad dark:bg-bad-dark' : 'bg-transparent'}`}
                  >
                    <Text className={`text-xs font-extrabold ${!isActive ? 'text-white' : 'text-ink-muted dark:text-ink-dark-muted'}`}>
                      {t('round.absentShort')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stepper Controls */}
              {isActive && (
                <View className="mt-2">
                  <StepperRow value={delta} onChange={(v) => setEntry(p.id, v)} />
                </View>
              )}
            </View>
          );
        })}

        {invalid && (
          <View className="mt-2 rounded-xl bg-bad/10 p-3 dark:bg-bad-dark/15">
            <Text className="text-center text-sm font-extrabold text-bad dark:text-bad-dark">
              {t('round.invalid')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Save Button Bar */}
      <View className="border-t border-rule bg-surface px-4 py-3 dark:border-rule-dark dark:bg-surface-dark">
        <TouchableOpacity
          onPress={save}
          disabled={invalid || saving || players.length === 0}
          accessibilityRole="button"
          className="items-center justify-center rounded-full bg-accent py-3.5 shadow-soft disabled:opacity-40 dark:bg-accent-dark dark:shadow-none"
        >
          <Text className="text-base font-extrabold text-white">
            {saving ? t('round.saving') : t('round.save')}
          </Text>
        </TouchableOpacity>
      </View>

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </SafeAreaView>
  );
}
