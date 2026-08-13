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
import { useT } from '@/lib/i18n';
import { rankByScore } from '@/lib/score';
import { useSettingsStore } from '@/store/settingsStore';

const MEDALS = ['#a0740c', '#787f8c', '#b0713f'];

function RankBadge({ rank }: { rank: number }) {
  if (rank >= 1 && rank <= 3) {
    return <Ionicons name="medal" size={26} color={MEDALS[rank - 1]} />;
  }
  return (
    <View className="h-8 w-8 items-center justify-center rounded-full bg-ink/5 dark:bg-ink-dark/10">
      <Text className="text-sm font-bold tabular-nums text-ink-muted dark:text-ink-dark-muted">{rank}</Text>
    </View>
  );
}

export default function CircleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const circleId = Number(id);
  const router = useRouter();
  const t = useT();

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
        } catch (e) {
          console.error('[CircleScreen] auto-pull failed:', e);
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
      },
    });
  };

  const ranked = rankByScore(stats.map((s) => ({ item: s, score: s.total }))).filter(
    (r) => r.item.sessionsPlayed > 0 || r.item.total !== 0
  );
  const canStart = players.length >= 2;

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <ScreenHeader title={circle?.name ?? 'Circle'} onBack={() => router.back()} />

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity
          onPress={startOrResume}
          disabled={!canStart}
          accessibilityRole="button"
          className="mt-1 flex-row items-center justify-center rounded-full bg-accent py-4 disabled:bg-ink/10 dark:bg-accent-dark dark:disabled:bg-ink-dark/10"
        >
          <Ionicons
            name={activeSessionId != null ? 'play' : 'add-circle'}
            size={20}
            color={canStart || activeSessionId != null ? '#ffffff' : '#5d6471'}
          />
          <Text
            className={`ml-2 text-base font-extrabold ${
              canStart || activeSessionId != null ? 'text-white' : 'text-ink-muted dark:text-ink-dark-muted'
            }`}
          >
            {activeSessionId != null ? t('circle.resume') : t('circle.start')}
          </Text>
        </TouchableOpacity>
        {!canStart && activeSessionId == null && (
          <Text className="mt-2 text-center text-xs text-ink-muted dark:text-ink-dark-muted">
            {t('circle.needPlayers')}
          </Text>
        )}

        <Text className="mb-3 mt-7 px-1 text-xs font-bold uppercase tracking-widest text-ink-muted dark:text-ink-dark-muted">
          {t('circle.players')}
        </Text>
        <View className="flex-row items-center">
          <TextInput
            className="mr-2 flex-1 h-12 rounded-xl bg-surface-fill px-4 text-base text-ink placeholder:text-ink-faint dark:bg-surface-dark-fill dark:text-ink-dark dark:placeholder:text-ink-dark-faint"
            placeholder={t('circle.addPlayer')}
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
            className="h-12 w-12 items-center justify-center rounded-full bg-accent disabled:opacity-40 dark:bg-accent-dark"
          >
            <Ionicons name="add" size={22} color="#ffffff" />
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
                className="mb-2 mr-2 flex-row items-center rounded-full bg-accent-soft py-2 pl-4 pr-3 dark:bg-[#1a2b42]"
              >
                <Text className="text-sm font-bold text-accent-deep dark:text-[#58a6ff]">{p.name}</Text>
                <Ionicons name="pencil" size={12} className="ml-2 text-accent/60 dark:text-[#58a6ff]/70" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="mt-4">
            <EmptyState icon="person-add-outline" message={t('circle.noPlayers')} />
          </View>
        )}

        <Text className="mb-3 mt-7 px-1 text-xs font-bold uppercase tracking-widest text-ink-muted dark:text-ink-dark-muted">
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
              className="mb-2 flex-row items-center rounded-2xl border border-rule bg-surface-alt px-4 py-4 shadow-soft active:opacity-80 dark:border-white/10 dark:bg-surface-dark-alt dark:shadow-none"
            >
              <View className="mr-3 w-9 items-center">
                <RankBadge rank={rank} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold text-ink dark:text-ink-dark" numberOfLines={1}>
                  {item.player.name}
                </Text>
                <Text className="mt-0.5 text-xs text-ink-muted dark:text-ink-dark-muted">
                  {t(item.wins === 1 ? 'circle.wins' : 'circle.winsMany', { count: item.wins })} ·{' '}
                  {t(item.sessionsPlayed === 1 ? 'circle.sessionsShort' : 'circle.sessionsShortMany', {
                    count: item.sessionsPlayed,
                  })}
                </Text>
              </View>
              <Text className="text-lg font-extrabold tabular-nums text-ink dark:text-ink-dark">{score}</Text>
              <Ionicons name="chevron-forward" size={16} className="ml-2 text-ink-muted dark:text-ink-dark-muted" />
            </TouchableOpacity>
          ))
        )}

        <Text className="mb-3 mt-7 px-1 text-xs font-bold uppercase tracking-widest text-ink-muted dark:text-ink-dark-muted">
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
                className="mb-2 flex-row items-center rounded-2xl border border-rule bg-surface-alt px-4 py-4 dark:border-white/10 dark:bg-surface-dark-alt dark:shadow-none"
              >
                <TouchableOpacity
                  disabled={active}
                  onPress={() => router.push({ pathname: '/session/[id]', params: { id: String(session.id) } })}
                  accessibilityRole="button"
                  className="min-w-0 flex-1"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-bold text-ink dark:text-ink-dark">
                      {formatDateTime(session.created_at)}
                    </Text>
                    <View className="ml-2 flex-row items-center">
                      <View className={`mr-2 h-1.5 w-1.5 rounded-full ${active ? 'bg-accent dark:bg-accent-dark' : 'bg-good dark:bg-good-dark'}`} />
                      <Text className={`text-xs font-bold ${active ? 'text-accent-deep dark:text-accent-dark-deep' : 'text-good dark:text-good-dark'}`}>
                        {active ? t('circle.active') : t('circle.finished')}
                      </Text>
                    </View>
                  </View>
                  {!active && (
                    <Text className="mt-1 text-xs text-ink-muted dark:text-ink-dark-muted" numberOfLines={1}>
                      {t('circle.winner', { names: winners.map((w) => w.item.player.name).join(', ') })}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmDeleteSession(session.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('circle.deleteSessionTitle')}
                  className="ml-3 h-10 w-10 items-center justify-center rounded-full bg-bad/10 dark:bg-bad-dark/10"
                >
                  <Ionicons name="trash-outline" size={16} className="text-bad dark:text-bad-dark" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal transparent visible={editingPlayer != null} animationType="fade" onRequestClose={() => setEditingPlayer(null)}>
        <Pressable className="flex-1 items-center justify-center bg-black/50 px-8" onPress={() => setEditingPlayer(null)}>
          <Pressable
            className="w-full rounded-[28px] border border-rule bg-surface-alt p-6 dark:border-rule-dark dark:bg-surface-dark-alt"
            onPress={() => {}}
          >
            <Text className="mb-4 text-lg font-extrabold tracking-tight text-ink dark:text-ink-dark">{t('circle.renamePlayer')}</Text>
            <TextInput
              className="mb-4 rounded-xl bg-surface-fill px-4 py-4 text-base text-ink placeholder:text-ink-faint dark:bg-surface-dark-fill dark:text-ink-dark dark:placeholder:text-ink-dark-faint"
              placeholder={t('circle.renamePlaceholder')}
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
              className="items-center rounded-full bg-accent py-4 disabled:opacity-40 dark:bg-accent-dark"
            >
              <Text className="text-base font-extrabold text-white">{t('common.save')}</Text>
            </TouchableOpacity>
            {editingPlayer && (
              <TouchableOpacity
                onPress={() => confirmDeletePlayer(editingPlayer)}
                accessibilityRole="button"
                className="mt-3 items-center rounded-full border border-bad/40 py-4 dark:border-bad-dark/40"
              >
                <Text className="text-base font-extrabold text-bad dark:text-bad-dark">{t('common.delete')}</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </SafeAreaView>
  );
}
