import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmDialog, { type ConfirmDialogOptions } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import ScreenHeader from '@/components/ScreenHeader';
import { getCircle } from '@/db/circleRepo';
import { syncCircleFromSnapshot } from '@/db/cloudSyncRepo';
import { getSeasonStats, getSessionSummaries } from '@/db/leaderboardRepo';
import { addPlayer, deletePlayer, listPlayers, renamePlayer } from '@/db/playerRepo';
import type { Circle, Player, SeasonPlayerStat, SessionSummary } from '@/db/models';
import { createSession, deleteSession, getActiveSession } from '@/db/sessionRepo';
import { pullCloudSync } from '@/lib/cloudSync';
import { DEFAULT_CLOUD_WORKER_URL } from '@/lib/cloudSyncCore';
import { formatDateTime } from '@/lib/format';
import { formatCount, useT } from '@/lib/i18n';
import { rankByScore, type TieBreaker } from '@/lib/score';
import { useThemeColor } from '@/lib/theme';
import { fireCloudSync } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';

const MEDALS = ['#a0740c', '#787f8c', '#b0713f'];

function RankBadge({ rank }: { rank: number }) {
  const inkMuted = useThemeColor('inkMuted');
  const border = useThemeColor('border');
  const surfaceElevated = useThemeColor('surfaceElevated');
  if (rank >= 1 && rank <= 3) {
    return <Ionicons name="medal" size={26} color={MEDALS[rank - 1]} />;
  }
  return (
    <View className="h-8 w-8 items-center justify-center rounded-full border" style={{ borderColor: border, backgroundColor: surfaceElevated }}>
      <Text className="text-sm font-bold tabular-nums" style={{ color: inkMuted }}>{rank}</Text>
    </View>
  );
}

export default function CircleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const circleId = Number(id);
  const router = useRouter();
  const t = useT();

  const bg = useThemeColor('bg');
  const surface = useThemeColor('surface');
  const surfaceElevated = useThemeColor('surfaceElevated');
  const ink = useThemeColor('ink');
  const inkMuted = useThemeColor('inkMuted');
  const inkFaint = useThemeColor('inkFaint');
  const border = useThemeColor('border');
  const primary = useThemeColor('primary');
  const bad = useThemeColor('bad');
  const primaryInk = useThemeColor('primaryInk');
  const good = useThemeColor('good');

  const [circle, setCircle] = useState<Circle | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<SeasonPlayerStat[]>([]);
  const [history, setHistory] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [newPlayer, setNewPlayer] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [confirm, setConfirm] = useState<ConfirmDialogOptions | null>(null);

  const refresh = useCallback(async () => {
    setCircle(await getCircle(circleId));
    setPlayers(await listPlayers(circleId));
    setStats(await getSeasonStats(circleId));
    setHistory(await getSessionSummaries(circleId));
    setActiveSessionId((await getActiveSession(circleId))?.id ?? null);
  }, [circleId]);

  const cloudSyncMode = useSettingsStore((s) => s.cloudSyncMode);
  const isJoined = useSettingsStore((s) => s.circleSyncMeta[circleId]?.remoteCircleId != null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      if (!isJoined || cloudSyncMode !== 'auto') return;
      const timer = setInterval(async () => {
        try {
          const { cloudWorkerUrl, shareCodes, circleSyncMeta, setCircleSyncMeta } = useSettingsStore.getState();
          const code = shareCodes[circleId];
          if (!code) return;
          const url = cloudWorkerUrl.trim() || DEFAULT_CLOUD_WORKER_URL;
          const snapshot = await pullCloudSync(url, code);
          await syncCircleFromSnapshot(circleId, snapshot, circleSyncMeta[circleId]?.lastSyncedAt ?? null);
          setCircleSyncMeta(circleId, { ...circleSyncMeta[circleId], lastSyncedAt: snapshot.syncedAt });
          refresh();
        } catch {
          // Ignore auto-pull polling errors
        }
      }, 15000);
      return () => clearInterval(timer);
    }, [refresh, circleId, isJoined, cloudSyncMode])
  );

  const submitPlayer = async () => {
    if (!newPlayer.trim()) return;
    await addPlayer(circleId, newPlayer);
    setNewPlayer('');
    refresh();
    fireCloudSync(circleId);
  };

  const openPlayerModal = (player: Player) => {
    setEditingPlayer(player);
    setNameDraft(player.name);
  };

  const savePlayerName = async () => {
    if (!editingPlayer || !nameDraft.trim()) return;
    await renamePlayer(editingPlayer.id, nameDraft);
    setEditingPlayer(null);
    refresh();
    fireCloudSync(circleId);
  };

  const confirmDeletePlayer = (player: Player) => {
    setEditingPlayer(null);
    setConfirm({
      title: t('circle.removePlayerTitle'),
      message: t('circle.removePlayerMsg', { name: player.name }),
      confirmText: t('common.remove'),
      destructive: true,
      icon: 'person-remove-outline',
      onConfirm: async () => {
        await deletePlayer(player.id);
        refresh();
        fireCloudSync(circleId, true);
      },
    });
  };

  const startOrResume = async () => {
    if (players.length < 2 && activeSessionId == null) return;
    let sessionId = activeSessionId;
    if (sessionId == null) sessionId = await createSession(circleId);
    router.push({ pathname: '/session/[id]', params: { id: String(sessionId) } });
  };

  const confirmDeleteSession = (sessionId: number) => {
    setConfirm({
      title: t('circle.deleteSessionTitle'),
      message: t('circle.deleteSessionMsg'),
      confirmText: t('common.delete'),
      destructive: true,
      icon: 'trash-outline',
      onConfirm: async () => {
        await deleteSession(sessionId);
        refresh();
        fireCloudSync(circleId, true);
      },
    });
  };

  const seasonTieBreakers: TieBreaker<SeasonPlayerStat>[] = [
    { value: (s) => s.wins, direction: 'desc' },
    { value: (s) => s.minus, direction: 'asc' },
    { value: (s) => s.sessionsPlayed, direction: 'asc' },
  ];
  const ranked = rankByScore(
    stats.map((s) => ({ item: s, score: s.total })),
    seasonTieBreakers
  ).filter((r) => r.item.sessionsPlayed > 0 || r.item.total !== 0);
  const canStart = players.length >= 2;
  const canAct = canStart || activeSessionId != null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <ScreenHeader title={circle?.name ?? 'Circle'} onBack={() => router.back()} />

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity
          onPress={startOrResume}
          disabled={!canAct}
          accessibilityRole="button"
          className="mt-1 flex-row items-center justify-center rounded-brutal border-2 py-4 shadow-brutal-1"
          style={{ borderColor: border, backgroundColor: primary, opacity: canAct ? 1 : 0.4 }}
        >
          <Ionicons
            name={activeSessionId != null ? 'play' : 'add-circle'}
            size={20}
            color={canAct ? primaryInk : inkMuted}
          />
          <Text
            className="ml-2 text-base font-extrabold"
            style={{ color: canAct ? primaryInk : inkMuted }}
          >
            {activeSessionId != null ? t('circle.resume') : t('circle.start')}
          </Text>
        </TouchableOpacity>
        {!canAct && (
          <Text className="mt-2 text-center text-xs" style={{ color: inkMuted }}>
            {t('circle.needPlayers')}
          </Text>
        )}

        <Text className="mb-3 mt-7 px-1 text-xs font-bold uppercase tracking-widest" style={{ color: inkMuted }}>
          {t('circle.players')}
        </Text>
        <View className="flex-row items-center">
          <TextInput
            className="mr-2 flex-1 h-12 rounded-brutal border-2 px-4 text-base"
            style={{ borderColor: border, backgroundColor: surfaceElevated, color: ink }}
            placeholder={t('circle.addPlayer')}
            placeholderTextColor={inkFaint}
            value={newPlayer}
            onChangeText={setNewPlayer}
            returnKeyType="done"
            onSubmitEditing={submitPlayer}
          />
          <TouchableOpacity
            onPress={submitPlayer}
            disabled={!newPlayer.trim()}
            accessibilityRole="button"
            accessibilityLabel={t('circle.addPlayer')}
            className="h-12 w-12 items-center justify-center rounded-brutal border-2 shadow-brutal-1"
            style={{ borderColor: border, backgroundColor: primary, opacity: newPlayer.trim() ? 1 : 0.4 }}
          >
            <Ionicons name="add" size={22} color={primaryInk} />
          </TouchableOpacity>
        </View>

        {players.length > 0 ? (
          <View className="mt-4 flex-row flex-wrap">
            {players.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => openPlayerModal(p)}
                onLongPress={() => confirmDeletePlayer(p)}
                accessibilityRole="button"
                className="mb-2 mr-2 flex-row items-center rounded-brutal border-2 py-2 pl-4 pr-3"
                style={{ borderColor: border, backgroundColor: surfaceElevated }}
              >
                <Text className="text-sm font-bold" style={{ color: primary }}>{p.name}</Text>
                <Ionicons name="pencil" size={12} color={primary} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="mt-4">
            <EmptyState icon="person-add-outline" message={t('circle.noPlayers')} />
          </View>
        )}

        <Text className="mb-3 mt-7 px-1 text-xs font-bold uppercase tracking-widest" style={{ color: inkMuted }}>
          {t('circle.leaderboard')}
        </Text>
        {ranked.length === 0 ? (
          <EmptyState icon="trophy-outline" message={t('circle.noLeaderboard')} />
        ) : (
          ranked.map(({ item, rank, score }) => (
            <TouchableOpacity
              key={item.player.id}
              onPress={() =>
                router.push({
                  pathname: '/circle/[id]/player/[playerId]',
                  params: { id: String(circleId), playerId: String(item.player.id) },
                })
              }
              accessibilityRole="button"
              className="mb-2 flex-row items-center rounded-brutal-lg border-2 px-4 py-4 shadow-brutal-1 active:opacity-80"
              style={{ borderColor: border, backgroundColor: surface }}
            >
              <View className="mr-3 w-9 items-center">
                <RankBadge rank={rank} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold" style={{ color: ink }} numberOfLines={1}>
                  {item.player.name}
                </Text>
                <Text className="mt-0.5 text-xs" style={{ color: inkMuted }}>
                  {[
                    item.wins > 0
                      ? `${formatCount(item.wins)} ${t(item.wins === 1 ? 'circle.wins' : 'circle.winsMany')}`
                      : null,
                    item.sessionsPlayed > 0
                      ? `${formatCount(item.sessionsPlayed)} ${t(item.sessionsPlayed === 1 ? 'circle.sessionsShort' : 'circle.sessionsShortMany')}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Text className="text-lg font-extrabold tabular-nums" style={{ color: ink }}>{score}</Text>
              <Ionicons name="chevron-forward" size={16} color={inkMuted} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          ))
        )}

        <Text className="mb-3 mt-7 px-1 text-xs font-bold uppercase tracking-widest" style={{ color: inkMuted }}>
          {t('circle.history')}
        </Text>
        {history.length === 0 ? (
          <EmptyState icon="time-outline" message={t('circle.noHistory')} />
        ) : (
          history.map(({ session, players: sessionPlayers }) => {
            const sorted = rankByScore(sessionPlayers.map((sp) => ({ item: sp, score: sp.total })));
            const winners = sorted.filter((r) => r.rank === 1);
            const active = session.status === 'active';
            return (
              <View
                key={session.id}
                className="mb-2 flex-row items-center rounded-brutal-lg border-2 px-4 py-4"
                style={{ borderColor: border, backgroundColor: surface }}
              >
                <TouchableOpacity
                  disabled={active}
                  onPress={() => router.push({ pathname: '/session/[id]', params: { id: String(session.id) } })}
                  accessibilityRole="button"
                  className="min-w-0 flex-1"
                >
                  <View className="flex-row items-center">
                    <Text className="text-sm font-bold" style={{ color: ink }}>
                      {formatDateTime(session.created_at)}
                    </Text>
                  </View>
                  {!active && (
                    <Text className="mt-1 text-xs" style={{ color: inkMuted }} numberOfLines={1}>
                      {t('circle.winner', { names: winners.map((w) => w.item.player.name).join(', ') })}
                    </Text>
                  )}
                </TouchableOpacity>
                <View className="ml-3 flex-1 flex-row items-center justify-end">
                  <View className="mr-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? primary : good }} />
                  <Text className="text-xs font-bold" style={{ color: active ? primary : good }}>
                    {active ? t('circle.active') : t('circle.finished')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => confirmDeleteSession(session.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('circle.deleteSessionTitle')}
                  className="ml-3 h-10 w-10 items-center justify-center rounded-brutal border"
                  style={{ borderColor: border, backgroundColor: surfaceElevated }}
                >
                  <Ionicons name="trash-outline" size={16} color={bad} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal transparent visible={editingPlayer != null} animationType="fade" onRequestClose={() => setEditingPlayer(null)}>
        <Pressable className="flex-1 items-center justify-center bg-black/50 px-8" onPress={() => setEditingPlayer(null)}>
          <Pressable
            className="w-full rounded-brutal-xl border-2 p-6 shadow-brutal-2"
            style={{ borderColor: border, backgroundColor: surface }}
            onPress={() => {}}
          >
            <Text className="mb-4 text-lg font-extrabold tracking-tight" style={{ color: ink }}>{t('circle.renamePlayer')}</Text>
            <TextInput
              className="mb-4 rounded-brutal border-2 px-4 py-4 text-base"
              style={{ borderColor: border, backgroundColor: surfaceElevated, color: ink }}
              placeholder={t('circle.renamePlaceholder')}
              placeholderTextColor={inkFaint}
              value={nameDraft}
              onChangeText={setNameDraft}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={savePlayerName}
            />
            <TouchableOpacity
              onPress={savePlayerName}
              disabled={!nameDraft.trim()}
              accessibilityRole="button"
              className="items-center rounded-brutal border-2 py-4 shadow-brutal-1"
              style={{ borderColor: border, backgroundColor: primary, opacity: nameDraft.trim() ? 1 : 0.4 }}
            >
              <Text className="text-base font-extrabold" style={{ color: primaryInk }}>{t('common.save')}</Text>
            </TouchableOpacity>
            {editingPlayer && (
              <TouchableOpacity
                onPress={() => confirmDeletePlayer(editingPlayer)}
                accessibilityRole="button"
                className="mt-3 items-center rounded-brutal border-2 py-4"
                style={{ borderColor: border, backgroundColor: surfaceElevated }}
              >
                <Text className="text-base font-extrabold" style={{ color: bad }}>{t('common.delete')}</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </SafeAreaView>
  );
}
