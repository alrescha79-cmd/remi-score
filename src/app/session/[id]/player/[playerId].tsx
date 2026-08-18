import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import { formatTime } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { formatSignedScore } from '@/lib/score';
import { useThemeColor } from '@/lib/theme';
import { useSessionStore } from '@/store/sessionStore';

function scoreColor(value: number | null, good: string, bad: string, muted: string): string {
  if (value === null) return muted;
  return value > 0 ? good : value < 0 ? bad : muted;
}

function formatAvg(val: number): string {
  const formatted = val % 1 === 0 ? val.toString() : val.toFixed(1);
  return val > 0 ? `+${formatted}` : formatted;
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
  const avgPerRound = playedRounds.length > 0 ? total / playedRounds.length : 0;

  const statItems = [
    {
      label: t('player.total'),
      value: formatSignedScore(total),
      color: total >= 0 ? good : bad,
      icon: '🎯',
    },
    {
      label: t('player.avgRound'),
      value: formatAvg(avgPerRound),
      color: avgPerRound >= 0 ? good : bad,
      icon: '📊',
    },
    {
      label: t('player.rounds'),
      value: String(playedRounds.length),
      color: ink,
      icon: '🎲',
    },
    {
      label: t('player.best'),
      value: best > 0 ? `+${best}` : String(best),
      color: good,
      icon: '⚡',
    },
    {
      label: t('player.worst'),
      value: formatSignedScore(worst),
      color: bad,
      icon: '💥',
    },
  ];

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

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header Card */}
        <View
          style={{ borderColor: border, backgroundColor: surface }}
          className="mb-5 flex-row items-center justify-between rounded-brutal-lg border-2 p-4 shadow-brutal-1"
        >
          <View className="flex-row items-center gap-3.5">
            <View
              style={{ borderColor: border, backgroundColor: surfaceElevated }}
              className="h-12 w-12 items-center justify-center rounded-full border-2"
            >
              <Text style={{ color: primary }} className="text-xl font-extrabold">
                {player.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={{ color: inkMuted }} className="text-[10px] font-extrabold uppercase tracking-wider">
                {t('player.profile')}
              </Text>
              <Text style={{ color: ink }} className="text-xl font-extrabold">
                {player.name}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap justify-between gap-y-2.5">
          {statItems.map((item, idx) => (
            <View
              key={idx}
              style={{
                borderColor: border,
                backgroundColor: surface,
                width: idx === 0 ? '100%' : '48.5%',
              }}
              className="rounded-brutal-lg border-2 p-3 shadow-brutal-1"
            >
              <View className="flex-row items-center justify-between">
                <Text style={{ color: inkMuted }} className="text-[11px] font-bold uppercase tracking-wider">
                  {item.label}
                </Text>
                <Text className="text-sm">{item.icon}</Text>
              </View>
              <Text style={{ color: item.color }} className="mt-1.5 text-lg font-extrabold tabular-nums">
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Rounds History */}
        <View className="mb-3 mt-6 flex-row items-center gap-1.5">
          <Text className="text-sm">📜</Text>
          <Text className="text-xs font-bold uppercase tracking-widest" style={{ color: inkMuted }}>
            {t('player.history')}
          </Text>
        </View>

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
              <View className="w-16 flex-row items-center justify-end gap-1">
                <Text
                  className="text-right text-base font-extrabold tabular-nums"
                  style={{ color: scoreColor(r.score_change, good, bad, inkMuted) }}
                >
                  {r.score_change === null ? t('round.absentShort') : formatSignedScore(r.score_change)}
                </Text>
                {r.is_edited === 1 && r.score_change !== null && (
                  <Text className="text-[10px]" title="Diedit">✏️</Text>
                )}
              </View>
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
