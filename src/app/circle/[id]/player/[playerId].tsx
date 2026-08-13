import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '@/components/EmptyState';
import ScreenHeader from '@/components/ScreenHeader';
import StatCard from '@/components/StatCard';
import { getSeasonStats, getSessionSummaries } from '@/db/leaderboardRepo';
import type { SeasonPlayerStat, SessionSummary } from '@/db/models';
import { formatDate } from '@/lib/format';
import { formatCount, useT } from '@/lib/i18n';
import { formatSignedScore, rankByScore } from '@/lib/score';
import { useThemeColor } from '@/lib/theme';

const MEDALS = ['#a0740c', '#787f8c', '#b0713f'];

export default function SeasonPlayerScreen() {
  const { id, playerId } = useLocalSearchParams<{ id: string; playerId: string }>();
  const circleId = Number(id);
  const pid = Number(playerId);
  const router = useRouter();
  const t = useT();

  const bg = useThemeColor('bg');
  const surface = useThemeColor('surface');
  const ink = useThemeColor('ink');
  const inkMuted = useThemeColor('inkMuted');
  const border = useThemeColor('border');
  const primary = useThemeColor('primary');
  const good = useThemeColor('good');

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

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} className="items-center justify-center">
        <ActivityIndicator size="large" color={primary} />
      </SafeAreaView>
    );
  }

  const season = rankByScore(stats.map((s) => ({ item: s, score: s.total }))).find(
    (r) => r.item.player.id === pid
  );
  const stat = season?.item;

  if (!stat) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} className="items-center justify-center">
        <Text style={{ color: inkMuted }}>{t('player.notFound')}</Text>
      </SafeAreaView>
    );
  }

  const sessionRows = history
    .filter((h) => h.players.some((sp) => sp.player.id === pid))
    .map((h) => {
      const sorted = rankByScore(h.players.map((sp) => ({ item: sp, score: sp.total })));
      const mine = sorted.find((r) => r.item.player.id === pid);
      return { session: h.session, total: mine?.score ?? 0, rank: mine?.rank ?? 0 };
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <ScreenHeader
        title={stat.player.name}
        onBack={() => router.back()}
        right={
          <Text style={{ color: ink }} className="text-xl font-extrabold tabular-nums">
            {formatSignedScore(stat.total)}
          </Text>
        }
      />

      <View className="flex-row gap-2 px-5 pt-1">
        <StatCard
          label={t('player.seasonRank')}
          value={`#${season?.rank ?? '-'}`}
          medal={season?.rank && season.rank <= 3 ? MEDALS[season.rank - 1] : undefined}
        />
        <StatCard label={t('player.total')} value={formatSignedScore(stat.total)} />
        <StatCard label={t('circle.winsMany')} value={String(stat.wins)} />
        <StatCard label={t('player.sessions')} value={String(stat.sessionsPlayed)} />
      </View>

      <Text style={{ color: inkMuted }} className="mb-3 mt-7 px-5 text-xs font-bold uppercase tracking-widest">
        {t('player.sessionScores')}
      </Text>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        {sessionRows.length === 0 ? (
          <EmptyState icon="calendar-outline" message={t('player.noSessions')} />
        ) : (
          sessionRows.map(({ session, total, rank }) => (
            <TouchableOpacity
              key={session.id}
              disabled={session.status === 'active'}
              onPress={() => router.push({ pathname: '/session/[id]', params: { id: String(session.id) } })}
              accessibilityRole="button"
              style={{ borderColor: border, backgroundColor: surface }}
              className="mb-2 flex-row items-center rounded-brutal-lg border-2 px-4 py-4 active:opacity-80"
            >
              <View className="mr-3 w-8 items-center">
                {rank >= 1 && rank <= 3 ? (
                  <Ionicons name="medal" size={22} color={MEDALS[rank - 1]} />
                ) : (
                  <Text style={{ color: inkMuted }} className="text-sm font-bold tabular-nums">#{rank}</Text>
                )}
              </View>
              <View className="min-w-0 flex-1">
                <Text style={{ color: ink }} className="text-sm font-bold">{formatDate(session.created_at)}</Text>
                <Text style={{ color: good }} className="mt-0.5 text-xs font-bold">
                  {session.status === 'completed' ? t('circle.finished') : t('circle.active')}
                </Text>
              </View>
              <Text style={{ color: ink }} className="text-lg font-extrabold tabular-nums">
                {formatSignedScore(total)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
