import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
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
        <ActivityIndicator size="large" color="#0071e3" />
      </SafeAreaView>
    );
  }

  const total = totals[pid] ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <ScreenHeader
        title={player.name}
        onBack={() => router.back()}
        right={
          <Text
            className={`text-xl font-extrabold tabular-nums ${
              total > 0 ? 'text-good dark:text-good-dark' : total < 0 ? 'text-bad dark:text-bad-dark' : 'text-ink-muted dark:text-ink-dark-muted'
            }`}
          >
            {formatSignedScore(total)}
          </Text>
        }
      />

      <View className="flex-row gap-2 px-5 pt-1">
        <StatCard label={t('player.total')} value={formatSignedScore(total)} />
        <StatCard label={t('player.rounds')} value={String(rounds.length)} />
        <StatCard label={t('player.best')} value={formatSignedScore(best)} positive />
        <StatCard label={t('player.worst')} value={formatSignedScore(worst)} negative />
      </View>

      <Text className="mb-3 mt-7 px-5 text-xs font-bold uppercase tracking-widest text-ink-muted dark:text-ink-dark-muted">
        {t('player.history')}
      </Text>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        {rounds.length === 0 ? (
          <Text className="py-8 text-center text-sm text-ink-muted dark:text-ink-dark-muted">{t('session.noScores')}</Text>
        ) : (
          rounds.map((r) => (
            <View
              key={r.id}
              className="mb-2 flex-row items-center rounded-2xl border border-rule bg-surface-alt px-4 py-3 dark:border-rule-dark dark:bg-surface-dark-alt dark:shadow-none"
            >
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-accent-soft dark:bg-accent-dark-soft">
                <Text className="text-xs font-extrabold tabular-nums text-accent-deep dark:text-accent-dark-deep">{r.round_number}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold text-ink dark:text-ink-dark">
                  {t('session.roundLabel', { n: r.round_number })}
                </Text>
                <Text className="mt-0.5 text-xs text-ink-muted dark:text-ink-dark-muted">{formatTime(r.timestamp)}</Text>
              </View>
              <Text
                className={`w-16 text-right text-base font-extrabold tabular-nums ${
                  r.score_change > 0
                    ? 'text-good dark:text-good-dark'
                    : r.score_change < 0
                      ? 'text-bad dark:text-bad-dark'
                      : 'text-ink-muted dark:text-ink-dark-muted'
                }`}
              >
                {formatSignedScore(r.score_change)}
              </Text>
              <Text className="w-16 text-right text-sm font-bold tabular-nums text-ink dark:text-ink-dark">
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
  const color = positive
    ? 'text-good dark:text-good-dark'
    : negative
      ? 'text-bad dark:text-bad-dark'
      : 'text-ink dark:text-ink-dark';
  return (
    <View className="flex-1 rounded-2xl border border-rule bg-surface-alt px-3 py-4 shadow-soft dark:border-rule-dark dark:bg-surface-dark-alt dark:shadow-none">
      <Text className="text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-ink-dark-muted">{label}</Text>
      <Text className={`mt-2 text-base font-extrabold tabular-nums ${color}`}>{value}</Text>
    </View>
  );
}
