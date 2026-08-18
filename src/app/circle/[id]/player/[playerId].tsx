import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '@/components/EmptyState';
import ScreenHeader from '@/components/ScreenHeader';
import { getSeasonStats, getSessionSummaries } from '@/db/leaderboardRepo';
import type { SeasonPlayerStat, SessionSummary } from '@/db/models';
import { formatDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { formatSignedScore, rankByScore, type TieBreaker } from '@/lib/score';
import { useThemeColor } from '@/lib/theme';

const MEDALS = ['#a0740c', '#787f8c', '#b0713f'];

function medalEmoji(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

function formatAvg(val: number): string {
  const formatted = val % 1 === 0 ? val.toString() : val.toFixed(1);
  return val > 0 ? `+${formatted}` : formatted;
}

export default function SeasonPlayerScreen() {
  const { id, playerId } = useLocalSearchParams<{ id: string; playerId: string }>();
  const circleId = Number(id);
  const pid = Number(playerId);
  const router = useRouter();
  const t = useT();

  const bg = useThemeColor('bg');
  const surface = useThemeColor('surface');
  const surfaceElevated = useThemeColor('surfaceElevated');
  const ink = useThemeColor('ink');
  const inkMuted = useThemeColor('inkMuted');
  const border = useThemeColor('border');
  const primary = useThemeColor('primary');
  const good = useThemeColor('good');
  const bad = useThemeColor('bad');

  const [stats, setStats] = useState<SeasonPlayerStat[]>([]);
  const [history, setHistory] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [allStats, sessions] = await Promise.all([
      getSeasonStats(circleId),
      getSessionSummaries(circleId),
    ]);
    setStats(allStats);
    setHistory(sessions);
    setLoading(false);
  }, [circleId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const sessionSeqMap = useMemo(() => {
    const map = new Map<number, number>();
    const sortedChronological = [...history].sort(
      (a, b) => new Date(a.session.created_at).getTime() - new Date(b.session.created_at).getTime() || a.session.id - b.session.id
    );
    sortedChronological.forEach((h, index) => {
      map.set(h.session.id, index + 1);
    });
    return map;
  }, [history]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} className="items-center justify-center">
        <ActivityIndicator size="large" color={primary} />
      </SafeAreaView>
    );
  }

  const seasonTieBreakers: TieBreaker<SeasonPlayerStat>[] = [
    { value: (s) => s.wins, direction: 'desc' },
    { value: (s) => s.minus, direction: 'asc' },
    { value: (s) => s.sessionsPlayed, direction: 'asc' },
  ];
  const season = rankByScore(
    stats.map((s) => ({ item: s, score: s.total })),
    seasonTieBreakers
  ).find((r) => r.item.player.id === pid);
  const stat = season?.item;

  if (!stat) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} className="items-center justify-center">
        <Text style={{ color: inkMuted }}>{t('player.notFound')}</Text>
      </SafeAreaView>
    );
  }

  const seasonRank = season?.rank ?? 0;
  const avgPerSession = stat.sessionsPlayed > 0 ? stat.total / stat.sessionsPlayed : 0;
  const avgPerRound = stat.roundsPlayed > 0 ? stat.total / stat.roundsPlayed : 0;

  const sessionRows = history
    .filter((h) => h.players.some((sp) => sp.player.id === pid))
    .map((h) => {
      const sorted = rankByScore(h.players.map((sp) => ({ item: sp, score: sp.total })));
      const mine = sorted.find((r) => r.item.player.id === pid);
      const seq = sessionSeqMap.get(h.session.id) ?? h.session.id;
      return {
        session: h.session,
        seq,
        label: h.session.label ?? `Sesi #${seq}`,
        total: mine?.score ?? 0,
        rank: mine?.rank ?? 0,
      };
    });

  const statItems = [
    {
      label: t('player.total'),
      value: formatSignedScore(stat.total),
      color: stat.total >= 0 ? good : bad,
      icon: '🎯',
    },
    {
      label: t('player.avgSession'),
      value: formatAvg(avgPerSession),
      color: avgPerSession >= 0 ? good : bad,
      icon: '📈',
    },
    {
      label: t('player.avgRound'),
      value: formatAvg(avgPerRound),
      color: avgPerRound >= 0 ? good : bad,
      icon: '📊',
    },
    {
      label: t('player.rounds'),
      value: String(stat.roundsPlayed),
      color: ink,
      icon: '🎲',
    },
    {
      label: t('player.best'),
      value: stat.best > 0 ? `+${stat.best}` : String(stat.best),
      color: good,
      icon: '⚡',
    },
    {
      label: t('player.worst'),
      value: formatSignedScore(stat.worst),
      color: bad,
      icon: '💥',
    },
    {
      label: t('player.sessions'),
      value: String(stat.sessionsPlayed),
      color: ink,
      icon: '🎴',
    },
    {
      label: t('player.victories'),
      value: t('player.victoriesCount', { count: stat.wins }),
      color: '#d97706',
      icon: '👑',
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <ScreenHeader
        title={stat.player.name}
        onBack={() => router.back()}
        right={
          <Text style={{ color: stat.total >= 0 ? good : bad }} className="text-xl font-extrabold tabular-nums">
            {formatSignedScore(stat.total)}
          </Text>
        }
      />

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
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
                {stat.player.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={{ color: inkMuted }} className="text-[10px] font-extrabold uppercase tracking-wider">
                {t('player.profile')}
              </Text>
              <Text style={{ color: ink }} className="text-xl font-extrabold">
                {stat.player.name}
              </Text>
            </View>
          </View>

          {seasonRank > 0 && (
            <View className="items-end">
              <Text style={{ color: inkMuted }} className="mb-1 text-[10px] font-extrabold uppercase tracking-wider">
                {t('player.seasonRank')}
              </Text>
              <View
                style={{
                  borderColor: border,
                  backgroundColor: seasonRank === 1 ? '#fef3c7' : surfaceElevated,
                }}
                className="flex-row items-center gap-1 rounded-lg border-2 px-2.5 py-1"
              >
                {seasonRank === 1 ? (
                  <>
                    <Text className="text-sm">👑</Text>
                    <Text style={{ color: '#b45309' }} className="text-xs font-extrabold">
                      {t('player.king')}
                    </Text>
                  </>
                ) : (
                  <>
                    {seasonRank <= 3 && <Text className="text-sm">{medalEmoji(seasonRank)}</Text>}
                    <Text style={{ color: ink }} className="text-xs font-extrabold">
                      #{seasonRank}
                    </Text>
                  </>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Stats Grid 2 Columns */}
        <View className="flex-row flex-wrap justify-between gap-y-2.5">
          {statItems.map((item, idx) => (
            <View
              key={idx}
              style={{
                borderColor: border,
                backgroundColor: surface,
                width: '48.5%',
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

        {/* Track Record Section */}
        <View className="mb-3 mt-6 flex-row items-center gap-1.5">
          <Text className="text-sm">📜</Text>
          <Text style={{ color: inkMuted }} className="text-xs font-bold uppercase tracking-widest">
            {t('player.sessionScores')}
          </Text>
        </View>

        {sessionRows.length === 0 ? (
          <EmptyState icon="calendar-outline" message={t('player.noSessions')} />
        ) : (
          sessionRows.map(({ session, seq, label, total, rank }) => (
            <TouchableOpacity
              key={session.id}
              onPress={() => router.push({ pathname: '/session/[id]', params: { id: String(session.id) } })}
              accessibilityRole="button"
              style={{ borderColor: border, backgroundColor: surface }}
              className="mb-2.5 flex-row items-center rounded-brutal-lg border-2 px-3.5 py-3 shadow-brutal-1 active:opacity-80"
            >
              <View
                style={{ borderColor: border, backgroundColor: surfaceElevated }}
                className="mr-3 h-8 min-w-[36px] items-center justify-center rounded-brutal border px-1.5"
              >
                <Text style={{ color: inkMuted }} className="text-xs font-extrabold tabular-nums">
                  #{seq}
                </Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text style={{ color: ink }} className="text-sm font-bold" numberOfLines={1}>
                  {label}
                </Text>
                <Text style={{ color: session.status === 'completed' ? good : primary }} className="mt-0.5 text-xs font-bold">
                  {session.status === 'completed' ? t('circle.finished') : t('circle.active')} • {formatDate(session.created_at)}
                </Text>
              </View>
              <View
                style={{
                  borderColor: border,
                  backgroundColor: total >= 0 ? (total > 0 ? '#dcfce7' : surfaceElevated) : '#fee2e2',
                }}
                className="rounded-lg border px-2.5 py-1"
              >
                <Text
                  style={{ color: total >= 0 ? (total > 0 ? '#15803d' : inkMuted) : '#b91c1c' }}
                  className="text-base font-extrabold tabular-nums"
                >
                  {formatSignedScore(total)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
