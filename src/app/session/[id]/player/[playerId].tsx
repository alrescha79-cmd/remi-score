import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatTime } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { formatSignedScore } from '@/lib/score';
import { useSessionStore } from '@/store/sessionStore';

export default function PlayerDetailScreen() {
  const { id, playerId } = useLocalSearchParams<{ id: string; playerId: string }>();
  const sessionId = Number(id);
  const pid = Number(playerId);
  const router = useRouter();
  const t = useT();
  const { players, scores, totals, loading, load } = useSessionStore();

  useEffect(() => {
    load(sessionId);
  }, [sessionId, load]);

  const player = players.find((p) => p.id === pid);

  const rounds = useMemo(
    () =>
      scores
        .filter((s) => s.player_id === pid)
        .sort((a, b) => a.round_number - b.round_number),
    [scores, pid]
  );

  const best = rounds.length > 0 ? Math.max(...rounds.map((r) => r.score_change)) : 0;
  const worst = rounds.length > 0 ? Math.min(...rounds.map((r) => r.score_change)) : 0;

  if (loading || !player) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#6d5dfc" />
      </SafeAreaView>
    );
  }

  const total = totals[pid] ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <View className="flex-row items-center px-4 pb-2 pt-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-surface-alt dark:bg-surface-dark-alt">
          <Ionicons name="arrow-back" size={20} color="#6b7280" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-extrabold text-ink dark:text-ink-dark" numberOfLines={1}>
          {player.name}
        </Text>
        <Text className={`text-xl font-bold tabular-nums ${total > 0 ? 'text-good' : total < 0 ? 'text-bad' : 'text-ink-muted dark:text-ink-dark-muted'}`}>
          {formatSignedScore(total)}
        </Text>
      </View>

      <View className="flex-row justify-between px-5 pt-2">
        <StatCard label={t('player.total')} value={formatSignedScore(total)} />
        <StatCard label={t('player.rounds')} value={String(rounds.length)} />
        <StatCard label={t('player.best')} value={formatSignedScore(best)} positive />
        <StatCard label={t('player.worst')} value={formatSignedScore(worst)} negative />
      </View>

      <Text className="mb-2 mt-6 px-5 text-sm font-semibold text-ink-muted dark:text-ink-dark-muted">
        {t('player.history')}
      </Text>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 24 }}>
        {rounds.length === 0 ? (
          <Text className="py-8 text-center text-sm text-ink-muted dark:text-ink-dark-muted">
            {t('session.noScores')}
          </Text>
        ) : (
          rounds.map((r) => (
            <View key={r.id} className="mb-2 flex-row items-center rounded-2xl bg-surface-alt px-4 py-3 dark:bg-surface-dark-alt">
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-accent-soft dark:bg-accent-dark-soft">
                <Text className="text-xs font-bold text-accent dark:text-white">{r.round_number}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
                  {t('session.roundLabel', { n: r.round_number })}
                </Text>
                <Text className="text-xs text-ink-muted dark:text-ink-dark-muted">{formatTime(r.timestamp)}</Text>
              </View>
              <Text className={`w-16 text-right text-base font-bold tabular-nums ${r.score_change > 0 ? 'text-good' : r.score_change < 0 ? 'text-bad' : 'text-ink-muted dark:text-ink-dark-muted'}`}>
                {formatSignedScore(r.score_change)}
              </Text>
              <Text className="w-16 text-right text-sm font-semibold tabular-nums text-ink dark:text-ink-dark">
                {formatSignedScore(r.cumulative_total)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  const color = positive ? 'text-good' : negative ? 'text-bad' : 'text-ink dark:text-ink-dark';
  return (
    <View className="flex-1 rounded-2xl bg-surface-alt px-3 py-3 dark:bg-surface-dark-alt">
      <Text className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted">{label}</Text>
      <Text className={`mt-1 text-base font-bold tabular-nums ${color}`}>{value}</Text>
    </View>
  );
}
