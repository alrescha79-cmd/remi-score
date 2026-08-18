import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
  const { players, ranking, scores, totals, active, status, loading, error, load, finish } = useSessionStore();
  const [confirm, setConfirm] = useState<ConfirmDialogOptions | null>(null);

  useFocusEffect(
    useCallback(() => {
      load(sessionId);
    }, [load, sessionId])
  );

  const lastRound = useMemo(() => {
    let max = 0;
    for (const s of scores) if (s.round_number > max) max = s.round_number;
    const delta = new Map<number, number | null>();
    const edited = new Map<number, boolean>();
    for (const s of scores) {
      if (s.round_number === max) {
        delta.set(s.player_id, s.score_change);
        edited.set(s.player_id, s.is_edited === 1);
      }
    }
    return { roundNumber: max, delta, edited };
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
                  delta={lastRound.roundNumber > 0 ? (lastRound.delta.get(item.id) ?? null) : null}
                  roundNumber={lastRound.roundNumber}
                  afk={active[item.id] === false}
                  isEdited={lastRound.edited.get(item.id)}
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

          {lastRound.roundNumber > 0 && status !== 'completed' && (
            <View className="mt-5">
              <Text className="mb-2 px-1 text-xs font-bold uppercase tracking-widest" style={{ color: inkMuted }}>
                {t('round.history')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
                {Array.from({ length: lastRound.roundNumber }, (_, i) => {
                  const n = i + 1;
                  const isLast = n === lastRound.roundNumber;
                  return (
                    <TouchableOpacity
                      key={n}
                      onPress={() =>
                        router.push({
                          pathname: '/session/[id]/edit-round',
                          params: { id: String(sessionId), round: String(n) },
                        })
                      }
                      accessibilityRole="button"
                      className="mr-2 h-10 w-10 items-center justify-center rounded-brutal border-2"
                      style={{
                        borderColor: isLast ? primary : border,
                        backgroundColor: isLast ? primary : surfaceElevated,
                      }}
                    >
                      <Text
                        className="text-sm font-extrabold tabular-nums"
                        style={{ color: isLast ? primaryInk : ink }}
                      >
                        {n}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text className="mt-1.5 px-1 text-[11px]" style={{ color: inkMuted }}>
                {t('round.edit')} →
              </Text>
            </View>
          )}

          {status !== 'completed' && (
            <>
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
            </>
          )}
        </ScrollView>
      )}

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </SafeAreaView>
  );
}
