import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '@/components/EmptyState';
import { getSeasonStats, getSessionSummaries } from '@/db/leaderboardRepo';
import type { SeasonPlayerStat, SessionSummary } from '@/db/models';
import { formatDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { formatSignedScore, rankByScore } from '@/lib/score';

const MEDALS = ['#f5a623', '#a6adb8', '#c2703a'];

export default function SeasonPlayerScreen() {
  const { id, playerId } = useLocalSearchParams<{ id: string; playerId: string }>();
  const circleId = Number(id);
  const pid = Number(playerId);
  const router = useRouter();
  const t = useT();

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
      <SafeAreaView className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#6d5dfc" />
      </SafeAreaView>
    );
  }

  const season = rankByScore(stats.map((s) => ({ item: s, score: s.total }))).find(
    (r) => r.item.player.id === pid
  );
  const stat = season?.item;

  if (!stat) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark">
        <Text className="text-ink-muted dark:text-ink-dark-muted">{t('player.notFound')}</Text>
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
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <View className="flex-row items-center px-4 pb-2 pt-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-surface-alt dark:bg-surface-dark-alt">
          <Ionicons name="arrow-back" size={20} color="#6b7280" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-extrabold text-ink dark:text-ink-dark" numberOfLines={1}>
          {stat.player.name}
        </Text>
        <Text className="text-xl font-bold tabular-nums text-ink dark:text-ink-dark">
          {formatSignedScore(stat.total)}
        </Text>
      </View>

      <View className="flex-row justify-between px-5 pt-2">
        <StatCard
          label={t('player.seasonRank')}
          value={`#${season?.rank ?? '-'}`}
          medal={season?.rank && season.rank <= 3 ? MEDALS[season.rank - 1] : undefined}
        />
        <StatCard label={t('player.total')} value={formatSignedScore(stat.total)} />
        <StatCard label={t('circle.wins', { count: stat.wins })} value={String(stat.wins)} />
        <StatCard label={t('player.sessions')} value={String(stat.sessionsPlayed)} />
      </View>

      <Text className="mb-2 mt-6 px-5 text-sm font-semibold text-ink-muted dark:text-ink-dark-muted">
        {t('player.sessionScores')}
      </Text>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 24 }}>
        {sessionRows.length === 0 ? (
          <EmptyState icon="calendar-outline" message={t('player.noSessions')} />
        ) : (
          sessionRows.map(({ session, total, rank }) => (
            <TouchableOpacity
              key={session.id}
              disabled={session.status === 'active'}
              onPress={() => router.push({ pathname: '/session/[id]', params: { id: String(session.id) } })}
              className="mb-2 flex-row items-center rounded-2xl bg-surface-alt px-4 py-3 active:opacity-80 dark:bg-surface-dark-alt"
            >
              <View className="mr-3 w-8 items-center">
                {rank >= 1 && rank <= 3 ? (
                  <Ionicons name="medal" size={22} color={MEDALS[rank - 1]} />
                ) : (
                  <Text className="text-sm font-bold text-ink-muted dark:text-ink-dark-muted">#{rank}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
                  {formatDate(session.created_at)}
                </Text>
                <Text className={`text-xs font-bold ${session.status === 'completed' ? 'text-good' : 'text-accent'}`}>
                  {session.status === 'completed' ? t('circle.finished') : t('circle.active')}
                </Text>
              </View>
              <Text className="text-lg font-bold tabular-nums text-ink dark:text-ink-dark">
                {formatSignedScore(total)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, medal }: { label: string; value: string; medal?: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-surface-alt px-3 py-3 dark:bg-surface-dark-alt">
      <Text className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted">{label}</Text>
      <View className="mt-1 flex-row items-center">
        {medal && <Ionicons name="medal" size={16} color={medal} className="mr-1" />}
        <Text className="text-base font-bold tabular-nums text-ink dark:text-ink-dark">{value}</Text>
      </View>
    </View>
  );
}
