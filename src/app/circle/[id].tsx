import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmDialog, { type ConfirmDialogOptions } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { getCircle } from '@/db/circleRepo';
import { getSeasonStats, getSessionSummaries } from '@/db/leaderboardRepo';
import { addPlayer, deletePlayer, listPlayers, renamePlayer } from '@/db/playerRepo';
import type { Circle, Player, SeasonPlayerStat, SessionSummary } from '@/db/models';
import { createSession, deleteSession, getActiveSession } from '@/db/sessionRepo';
import { formatDateTime } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { rankByScore } from '@/lib/score';

const MEDALS = ['#f5a623', '#a6adb8', '#c2703a'];

function RankBadge({ rank }: { rank: number }) {
  if (rank >= 1 && rank <= 3) {
    return <Ionicons name="medal" size={26} color={MEDALS[rank - 1]} />;
  }
  return (
    <View className="h-7 w-7 items-center justify-center rounded-full bg-ink/10 dark:bg-ink-dark/10">
      <Text className="text-xs font-bold text-ink-muted dark:text-ink-dark-muted">{rank}</Text>
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

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
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
      <View className="flex-row items-center px-4 pb-2 pt-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-surface-alt dark:bg-surface-dark-alt">
          <Ionicons name="arrow-back" size={20} color="#6b7280" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-extrabold text-ink dark:text-ink-dark" numberOfLines={1}>
          {circle?.name ?? 'Circle'}
        </Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <TouchableOpacity
          onPress={startOrResume}
          disabled={!canStart}
          className="mt-2 flex-row items-center justify-center rounded-2xl bg-accent py-4 disabled:bg-ink/15 dark:disabled:bg-ink-dark/15"
        >
          <Ionicons
            name={activeSessionId != null ? 'play' : 'add-circle'}
            size={20}
            color={canStart || activeSessionId != null ? 'white' : '#9aa3af'}
          />
          <Text className={`ml-2 text-base font-bold ${canStart || activeSessionId != null ? 'text-white' : 'text-ink-muted dark:text-ink-dark-muted'}`}>
            {activeSessionId != null ? t('circle.resume') : t('circle.start')}
          </Text>
        </TouchableOpacity>
        {!canStart && activeSessionId == null && (
          <Text className="mt-1.5 text-center text-xs text-ink-muted dark:text-ink-dark-muted">
            {t('circle.needPlayers')}
          </Text>
        )}

        <Text className="mb-2 mt-6 text-sm font-semibold text-ink-muted dark:text-ink-dark-muted">
          {t('circle.players')}
        </Text>
        <View className="flex-row items-center">
          <TextInput
            className="mr-2 flex-1 rounded-xl border border-ink/15 bg-surface-alt px-4 py-3 text-base text-ink dark:border-ink-dark/15 dark:bg-surface-dark-alt dark:text-ink-dark"
            placeholder={t('circle.addPlayer')}
            placeholderTextColor="#9aa3af"
            value={newPlayer}
            onChangeText={setNewPlayer}
            returnKeyType="done"
            onSubmitEditing={submitPlayer}
          />
          <TouchableOpacity onPress={submitPlayer} disabled={!newPlayer.trim()} className="h-12 w-12 items-center justify-center rounded-xl bg-accent disabled:opacity-40">
            <Ionicons name="add" size={22} color="white" />
          </TouchableOpacity>
        </View>

        {players.length > 0 ? (
          <View className="mt-3 flex-row flex-wrap">
            {players.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => openPlayerModal(p)}
                onLongPress={() => confirmDeletePlayer(p)}
                className="mb-2 mr-2 flex-row items-center rounded-full bg-accent-soft py-2 pl-4 pr-3 dark:bg-accent-dark-soft"
              >
                <Text className="text-sm font-semibold text-accent dark:text-white">{p.name}</Text>
                <Ionicons name="pencil" size={13} color="#9aa3af" className="ml-1.5" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState icon="person-add-outline" message={t('circle.noPlayers')} />
        )}

        <Text className="mb-2 mt-6 text-sm font-semibold text-ink-muted dark:text-ink-dark-muted">
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
              className="mb-2 flex-row items-center rounded-2xl bg-surface-alt px-4 py-3 active:opacity-80 dark:bg-surface-dark-alt"
            >
              <View className="mr-3 w-8 items-center">
                <RankBadge rank={rank} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-ink dark:text-ink-dark">{item.player.name}</Text>
                <Text className="text-xs text-ink-muted dark:text-ink-dark-muted">
                  {t(item.wins === 1 ? 'circle.wins' : 'circle.winsMany', { count: item.wins })} ·{' '}
                  {t(item.sessionsPlayed === 1 ? 'circle.sessionsShort' : 'circle.sessionsShortMany', {
                    count: item.sessionsPlayed,
                  })}
                </Text>
              </View>
              <Text className="text-lg font-bold tabular-nums text-ink dark:text-ink-dark">{score}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9aa3af" className="ml-2" />
            </TouchableOpacity>
          ))
        )}

        <Text className="mb-2 mt-6 text-sm font-semibold text-ink-muted dark:text-ink-dark-muted">
          {t('circle.history')}
        </Text>
        {history.length === 0 ? (
          <EmptyState icon="time-outline" message={t('circle.noHistory')} />
        ) : (
          history.map(({ session, players: sessionPlayers }) => {
            const sorted = rankByScore(sessionPlayers.map((sp) => ({ item: sp, score: sp.total })));
            const winners = sorted.filter((r) => r.rank === 1);
            return (
              <TouchableOpacity
                key={session.id}
                disabled={session.status === 'active'}
                onPress={() => router.push({ pathname: '/session/[id]', params: { id: String(session.id) } })}
                className="mb-2 flex-row items-center rounded-2xl bg-surface-alt px-4 py-3 dark:bg-surface-dark-alt"
              >
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
                      {formatDateTime(session.created_at)}
                    </Text>
                    <Text className={`text-xs font-bold ${session.status === 'completed' ? 'text-good' : 'text-accent'}`}>
                      {session.status === 'completed' ? t('circle.finished') : t('circle.active')}
                    </Text>
                  </View>
                  {session.status === 'completed' && (
                    <Text className="mt-1 text-xs text-ink-muted dark:text-ink-dark-muted">
                      {t('circle.winner', { names: winners.map((w) => w.item.player.name).join(', ') })}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => confirmDeleteSession(session.id)}
                  className="ml-3 h-9 w-9 items-center justify-center rounded-full bg-bad/10"
                >
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal transparent visible={editingPlayer != null} animationType="fade" onRequestClose={() => setEditingPlayer(null)}>
        <Pressable className="flex-1 items-center justify-center bg-black/50 px-8" onPress={() => setEditingPlayer(null)}>
          <Pressable className="w-full rounded-3xl bg-surface p-6 dark:bg-surface-dark-alt" onPress={() => {}}>
            <Text className="mb-4 text-lg font-bold text-ink dark:text-ink-dark">{t('circle.renamePlayer')}</Text>
            <TextInput
              className="mb-4 rounded-xl border border-ink/15 bg-surface-alt px-4 py-3 text-base text-ink dark:border-ink-dark/15 dark:bg-surface-dark dark:text-ink-dark"
              placeholder={t('circle.renamePlaceholder')}
              placeholderTextColor="#9aa3af"
              value={nameDraft}
              onChangeText={setNameDraft}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={savePlayerName}
            />
            <TouchableOpacity
              onPress={savePlayerName}
              disabled={!nameDraft.trim()}
              className="items-center rounded-xl bg-accent py-3 disabled:opacity-40"
            >
              <Text className="text-base font-bold text-white">{t('common.save')}</Text>
            </TouchableOpacity>
            {editingPlayer && (
              <TouchableOpacity
                onPress={() => confirmDeletePlayer(editingPlayer)}
                className="mt-3 items-center rounded-xl border border-bad/40 py-3"
              >
                <Text className="text-base font-bold text-bad">{t('common.delete')}</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </SafeAreaView>
  );
}
