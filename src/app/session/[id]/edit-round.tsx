import ConfirmDialog, { type ConfirmDialogOptions } from '@/components/ConfirmDialog';
import ScreenHeader from '@/components/ScreenHeader';
import StepperRow from '@/components/StepperRow';
import { useT } from '@/lib/i18n';
import { formatSignedScore, validateScore } from '@/lib/score';
import { useThemeColor } from '@/lib/theme';
import { useSessionStore } from '@/store/sessionStore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditRoundScreen() {
  const { id, round } = useLocalSearchParams<{ id: string; round: string }>();
  const sessionId = Number(id);
  const roundNumber = Number(round);
  const router = useRouter();
  const t = useT();
  const { players, scores, totals, active, status, load, editRound, removeRound, setActive } = useSessionStore();
  const bg = useThemeColor('bg');
  const surface = useThemeColor('surface');
  const surfaceElevated = useThemeColor('surfaceElevated');
  const ink = useThemeColor('ink');
  const inkMuted = useThemeColor('inkMuted');
  const inkFaint = useThemeColor('inkFaint');
  const border = useThemeColor('border');
  const primary = useThemeColor('primary');
  const good = useThemeColor('good');
  const bad = useThemeColor('bad');
  const goodInk = useThemeColor('goodInk');
  const badInk = useThemeColor('badInk');
  const primaryInk = useThemeColor('primaryInk');
  const [overrides, setOverrides] = useState<Record<number, number>>({});
  const [activeOverrides, setActiveOverrides] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmDialogOptions | null>(null);

  useFocusEffect(
    useCallback(() => {
      load(sessionId).then(() => {
        const curStatus = useSessionStore.getState().status;
        if (curStatus === 'completed') {
          router.replace({ pathname: '/session/[id]', params: { id: String(sessionId) } });
        }
      });
      setOverrides({});
      setActiveOverrides({});
    }, [load, sessionId])
  );

  // Existing score_change for each player in the selected round.
  const existing = useMemo(() => {
    const m = new Map<number, number | null>();
    for (const s of scores) {
      if (s.round_number === roundNumber) m.set(s.player_id, s.score_change);
    }
    return m;
  }, [scores, roundNumber]);

  const isPlayerActive = (playerId: number) => {
    if (activeOverrides[playerId] !== undefined) return activeOverrides[playerId];
    const existingChange = existing.get(playerId);
    if (existingChange !== undefined) return existingChange !== null;
    return active[playerId] !== false;
  };

  const handleToggleActive = (playerId: number, isPlay: boolean) => {
    setActiveOverrides((prev) => ({ ...prev, [playerId]: isPlay }));
    setActive(playerId, isPlay);
  };

  const entries: Record<number, number | null> = {};
  for (const p of players) {
    const isAfk = !isPlayerActive(p.id);
    entries[p.id] = isAfk ? null : overrides[p.id] ?? existing.get(p.id) ?? 0;
  }

  const setEntry = (playerId: number, value: number) =>
    setOverrides((prev) => ({ ...prev, [playerId]: value }));

  const invalid = players.some((p) => isPlayerActive(p.id) && !validateScore(entries[p.id]));

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aActive = isPlayerActive(a.id);
      const bActive = isPlayerActive(b.id);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });
  }, [players, active, activeOverrides, existing]);

  const save = async () => {
    if (invalid) return;
    setSaving(true);
    try {
      await editRound(
        roundNumber,
        players.map((p) => ({ playerId: p.id, scoreChange: entries[p.id] }))
      );
      router.back();
    } catch (e) {
      setSaving(false);
      setConfirm({
        title: t('common.error'),
        message: e instanceof Error ? e.message : t('common.failedRound'),
        confirmText: t('common.ok'),
        hideCancel: true,
        icon: 'alert-circle-outline',
        iconTone: 'bad',
        onConfirm: () => {},
      });
    }
  };

  const confirmDelete = () => {
    setConfirm({
      title: t('round.deleteTitle'),
      message: t('round.deleteMsg', { n: roundNumber }),
      confirmText: t('common.delete'),
      destructive: true,
      icon: 'trash-outline',
      onConfirm: async () => {
        setSaving(true);
        try {
          await removeRound(roundNumber);
          router.back();
        } catch (e) {
          setSaving(false);
          setConfirm({
            title: t('common.error'),
            message: e instanceof Error ? e.message : t('common.failedRound'),
            confirmText: t('common.ok'),
            hideCancel: true,
            icon: 'alert-circle-outline',
            iconTone: 'bad',
            onConfirm: () => {},
          });
        }
      },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'bottom']}>
      <ScreenHeader
        compact
        title={t('round.editTitle', { n: roundNumber })}
        onBack={() => router.back()}
      />

      <View
        className="mx-4 mb-2.5 rounded-brutal-lg border-2 p-2.5"
        style={{ borderColor: border, backgroundColor: surface }}
      >
        <Text className="text-xs font-bold" style={{ color: inkMuted }}>
          {t('round.editHint')}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 20 }}>
        {sortedPlayers.map((p) => {
          const isActive = isPlayerActive(p.id);
          const delta = entries[p.id];

          return (
            <View
              key={p.id}
              className="mb-2.5 rounded-brutal-lg border-2 p-3"
              style={isActive
                ? { borderColor: border, backgroundColor: surface }
                : { borderColor: inkMuted, backgroundColor: surface, opacity: 0.6 }
              }
            >
              <View className="flex-row items-center justify-between">
                <View className="min-w-0 flex-1 flex-row items-center gap-2">
                  <View className="h-8 w-8 shrink-0 items-center justify-center rounded-brutal" style={{ backgroundColor: isActive ? surfaceElevated : inkFaint }}>
                    <Ionicons name="person" size={15} color={isActive ? primary : inkMuted} />
                  </View>
                  <Text className="min-w-0 flex-1 text-xl font-extrabold" style={{ color: isActive ? ink : inkMuted }} numberOfLines={1}>
                    {p.name}
                  </Text>
                </View>

                <View className="ml-2 flex-row rounded-brutal border-2 p-0.5" style={{ borderColor: border }}>
                  <TouchableOpacity
                    onPress={() => handleToggleActive(p.id, true)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    className="rounded-brutal px-2.5 py-1"
                    style={{ backgroundColor: isActive ? good : 'transparent' }}
                  >
                    <Text className="text-xs font-extrabold" style={{ color: isActive ? goodInk : inkMuted }}>
                      {t('round.play')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleToggleActive(p.id, false)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: !isActive }}
                    className="rounded-brutal px-2.5 py-1"
                    style={{ backgroundColor: !isActive ? bad : 'transparent' }}
                  >
                    <Text className="text-xs font-extrabold" style={{ color: !isActive ? badInk : inkMuted }}>
                      {t('round.absentShort')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {isActive ? (
                <View className="mt-2">
                  <StepperRow value={delta ?? 0} onChange={(v) => setEntry(p.id, v)} />
                </View>
              ) : (
                <Text className="mt-2 text-xs font-bold" style={{ color: inkFaint }}>
                  {t('round.absentMsg', { total: formatSignedScore(totals[p.id] ?? 0) })}
                </Text>
              )}
            </View>
          );
        })}

        {invalid && (
          <View className="mt-2 rounded-brutal border-2 p-3" style={{ borderColor: bad, backgroundColor: bad }}>
            <Text className="text-center text-sm font-extrabold" style={{ color: bad }}>
              {t('round.invalid')}
            </Text>
          </View>
        )}
      </ScrollView>

      <View className="border-t-2 px-4 py-3" style={{ borderColor: border, backgroundColor: bg }}>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={confirmDelete}
            accessibilityRole="button"
            className="items-center justify-center rounded-brutal border-2 py-3.5"
            style={{ borderColor: bad, backgroundColor: surfaceElevated }}
          >
            <Ionicons name="trash-outline" size={18} color={bad} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={save}
            disabled={invalid || saving}
            accessibilityRole="button"
            className="flex-1 items-center justify-center rounded-brutal border-2 py-3.5 shadow-brutal-1"
            style={{ borderColor: border, backgroundColor: primary, opacity: invalid || saving ? 0.4 : 1 }}
          >
            <Text className="text-base font-extrabold" style={{ color: primaryInk }}>
              {saving ? t('round.saving') : t('round.saveEdit')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </SafeAreaView>
  );
}
