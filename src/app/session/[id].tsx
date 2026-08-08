import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmDialog, { type ConfirmDialogOptions } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import PlayerCard from '@/components/PlayerCard';
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
      <View className="flex-row items-center px-4 pb-2 pt-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-surface-alt dark:bg-surface-dark-alt">
          <Ionicons name="arrow-back" size={20} color="#6b7280" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-ink dark:text-ink-dark">{t('session.live')}</Text>
          <Text className="text-xs text-ink-muted dark:text-ink-dark-muted">
            {t(lastRound.roundNumber === 1 ? 'session.rounds' : 'session.roundsMany', {
              count: lastRound.roundNumber,
            })}{' '}
            · {t('session.players', { count: players.length })}
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6d5dfc" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-ink-muted dark:text-ink-dark-muted">{error}</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 24 }}>
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
            className="mt-4 flex-row items-center justify-center rounded-2xl bg-accent py-4"
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="ml-1 text-base font-bold text-white">{t('session.addRound')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={confirmEnd}
            disabled={lastRound.roundNumber === 0}
            className="mt-3 flex-row items-center justify-center rounded-2xl border border-bad/40 py-4 disabled:opacity-40"
          >
            <Ionicons name="flag" size={18} color="#dc2626" />
            <Text className="ml-2 text-base font-bold text-bad">{t('session.end')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </SafeAreaView>
  );
}
