import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmDialog, { type ConfirmDialogOptions } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import PlayerCard from '@/components/PlayerCard';
import ScreenHeader from '@/components/ScreenHeader';
import { useT } from '@/lib/i18n';
import { useSessionStore } from '@/store/sessionStore';

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);
  const router = useRouter();
  const t = useT();
  const { players, ranking, scores, totals, loading, error, load, finish } = useSessionStore();
  const [confirm, setConfirm] = useState<ConfirmDialogOptions | null>(null);

  useEffect(() => {
    load(sessionId);
  }, [sessionId, load]);

  const lastRound = useMemo(() => {
    let max = 0;
    for (const s of scores) if (s.round_number > max) max = s.round_number;
    const delta = new Map<number, number>();
    for (const s of scores) if (s.round_number === max) delta.set(s.player_id, s.score_change);
    return { roundNumber: max, delta };
  }, [scores]);

  const confirmEnd = () => {
    setConfirm({
      title: t('session.endTitle'),
      message: t('session.endMsg'),
      confirmText: t('session.endConfirm'),
      destructive: true,
      icon: 'flag-outline',
      onConfirm: async () => {
        await finish();
        router.back();
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <ScreenHeader
        title={t('session.live')}
        subtitle={`${t(lastRound.roundNumber === 1 ? 'session.rounds' : 'session.roundsMany', {
          count: lastRound.roundNumber,
        })} · ${t('session.players', { count: players.length })}`}
        onBack={() => router.back()}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0071e3" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-ink-muted dark:text-ink-dark-muted">{error}</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
          {ranking.length === 0 ? (
            <EmptyState icon="hand-left-outline" message={t('session.noScores')} />
          ) : (
            ranking.map(({ item, rank }) => (
              <View key={item.id} className="mb-2">
                <PlayerCard
                  rank={rank}
                  name={item.name}
                  total={totals[item.id] ?? 0}
                  delta={lastRound.roundNumber > 0 ? lastRound.delta.get(item.id) ?? 0 : null}
                  roundNumber={lastRound.roundNumber}
                  onPress={() =>
                    router.push({
                      pathname: '/session/[id]/player/[playerId]',
                      params: { id: String(sessionId), playerId: String(item.id) },
                    })
                  }
                />
              </View>
            ))
          )}

          <TouchableOpacity
            onPress={() => router.push({ pathname: '/session/[id]/add-round', params: { id: String(sessionId) } })}
            accessibilityRole="button"
            className="mt-5 flex-row items-center justify-center rounded-full bg-accent py-4 dark:bg-accent-dark"
          >
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text className="ml-2 text-base font-extrabold text-white">{t('session.addRound')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={confirmEnd}
            disabled={lastRound.roundNumber === 0}
            accessibilityRole="button"
            className="mt-3 flex-row items-center justify-center rounded-full border border-bad/40 py-4 disabled:opacity-40 dark:border-bad-dark/40"
          >
            <Ionicons name="flag" size={18} className="text-bad dark:text-bad-dark" />
            <Text className="ml-2 text-base font-extrabold text-bad dark:text-bad-dark">{t('session.end')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </SafeAreaView>
  );
}
