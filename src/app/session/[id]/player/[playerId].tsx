import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import StatCard from '@/components/StatCard';
import { formatTime } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { formatSignedScore } from '@/lib/score';
import { useThemeColor } from '@/lib/theme';
import { useSessionStore } from '@/store/sessionStore';

function scoreColor(value: number | null, good: string, bad: string, muted: string): string {
  if (value === null) return muted;
  return value > 0 ? good : value < 0 ? bad : muted;
}

export default function PlayerDetailScreen() {
  const { id, playerId } = useLocalSearchParams<{ id: string; playerId: string }>();
  const sessionId = Number(id);
  const pid = Number(playerId);
  const router = useRouter();
  const t = useT();
  const { players, scores, totals, loading, load } = useSessionStore();

  const bg = useThemeColor('bg');
  const surface = useThemeColor('surface');
  const surfaceElevated = useThemeColor('surfaceElevated');
  const ink = useThemeColor('ink');
  const inkMuted = useThemeColor('inkMuted');
  const border = useThemeColor('border');
  const primary = useThemeColor('primary');
  const good = useThemeColor('good');
  const bad = useThemeColor('bad');

  useFocusEffect(
    useCallback(() => {
      load(sessionId);
    }, [load, sessionId])
  );

  const player = players.find((p) => p.id === pid);

  const rounds = useMemo(
    () =>
      scores
        .filter((s) => s.player_id === pid)
        .sort((a, b) => a.round_number - b.round_number),
    [scores, pid]
  );

  const playedRounds = useMemo(
    () => rounds.filter((r) => r.score_change !== null),
    [rounds]
  );
  const best = playedRounds.length > 0 ? Math.max(...playedRounds.map((r) => r.score_change!)) : 0;
  const worst = playedRounds.length > 0 ? Math.min(...playedRounds.map((r) => r.score_change!)) : 0;

  if (loading || !player) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
        <ActivityIndicator size="large" color={primary} />
      </SafeAreaView>
    );
  }

  const total = totals[pid] ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <ScreenHeader
        title={player.name}
        onBack={() => router.back()}
        right={
          <Text
            className="text-xl font-extrabold tabular-nums"
            style={{ color: scoreColor(total, good, bad, inkMuted) }}
          >
            {formatSignedScore(total)}
          </Text>
        }
      />

      <View className="flex-row gap-2 px-5 pt-1">
        <StatCard label={t('player.total')} value={formatSignedScore(total)} color={scoreColor(total, good, bad, inkMuted)} />
        <StatCard label={t('player.rounds')} value={String(playedRounds.length)} />
        <StatCard label={t('player.best')} value={formatSignedScore(best)} color={good} />
        <StatCard label={t('player.worst')} value={formatSignedScore(worst)} color={bad} />
      </View>

      <Text className="mb-3 mt-7 px-5 text-xs font-bold uppercase tracking-widest" style={{ color: inkMuted }}>
        {t('player.history')}
      </Text>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        {rounds.length === 0 ? (
          <Text className="py-8 text-center text-sm" style={{ color: inkMuted }}>{t('session.noScores')}</Text>
        ) : (
          rounds.map((r) => (
            <View
              key={r.id}
              className="mb-2 flex-row items-center rounded-brutal-lg border-2 px-4 py-3 shadow-brutal-1"
              style={{ borderColor: border, backgroundColor: surface }}
            >
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-brutal border" style={{ borderColor: border, backgroundColor: surfaceElevated }}>
                <Text className="text-xs font-extrabold tabular-nums" style={{ color: primary }}>{r.round_number}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold" style={{ color: ink }}>
                  {t('session.roundLabel', { n: r.round_number })}
                </Text>
                <Text className="mt-0.5 text-xs" style={{ color: inkMuted }}>{formatTime(r.timestamp)}</Text>
              </View>
              <Text
                className="w-16 text-right text-base font-extrabold tabular-nums"
                style={{ color: scoreColor(r.score_change, good, bad, inkMuted) }}
              >
                {r.score_change === null ? t('round.absentShort') : formatSignedScore(r.score_change)}
              </Text>
              <Text className="w-16 text-right text-sm font-bold tabular-nums" style={{ color: ink }}>
                {formatSignedScore(r.cumulative_total)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
