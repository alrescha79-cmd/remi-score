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
import { useThemeColor } from '@/lib/theme';
import { useSessionStore } from '@/store/sessionStore';

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);
  const router = useRouter();
  const t = useT();
  const bg = useThemeColor('bg');
  const surface = useThemeColor('surface');
  const surfaceElevated = useThemeColor('surfaceElevated');
  const ink = useThemeColor('ink');
  const inkMuted = useThemeColor('inkMuted');
  const border = useThemeColor('border');
  const primary = useThemeColor('primary');
  const bad = useThemeColor('bad');
  const primaryInk = useThemeColor('primaryInk');
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
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <ScreenHeader
        title={t('session.live')}
        subtitle={`${lastRound.roundNumber} ${t(lastRound.roundNumber === 1 ? 'session.rounds' : 'session.roundsMany')} · ${players.length} ${t(players.length === 1 ? 'session.players' : 'session.playersMany')}`}
        onBack={() => router.back()}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={primary} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center" style={{ color: inkMuted }}>{error}</Text>
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
            className="mt-5 flex-row items-center justify-center rounded-brutal border-2 py-4 shadow-brutal-1"
            style={{ borderColor: border, backgroundColor: primary }}
          >
            <Ionicons name="add" size={20} color={primaryInk} />
            <Text className="ml-2 text-base font-extrabold" style={{ color: primaryInk }}>{t('session.addRound')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={confirmEnd}
            disabled={lastRound.roundNumber === 0}
            accessibilityRole="button"
            className="mt-3 flex-row items-center justify-center rounded-brutal border-2 py-4"
            style={{ borderColor: border, backgroundColor: surfaceElevated, opacity: lastRound.roundNumber === 0 ? 0.4 : 1 }}
          >
            <Ionicons name="flag" size={18} color={bad} />
            <Text className="ml-2 text-base font-extrabold" style={{ color: bad }}>{t('session.end')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </SafeAreaView>
  );
}
