import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmDialog, { type ConfirmDialogOptions } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { createCircle, deleteCircle, listCircles } from '@/db/circleRepo';
import { purgeSyncMapForCircle, syncCircleFromSnapshot } from '@/db/cloudSyncRepo';
import type { CircleWithStats } from '@/db/models';
import { deleteCloudCircle, pullCloudSync } from '@/lib/cloudSync';
import { DEFAULT_CLOUD_WORKER_URL, validateShareCode } from '@/lib/cloudSyncCore';
import { formatDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useSettingsStore } from '@/store/settingsStore';

export default function HomeScreen() {
  const router = useRouter();
  const t = useT();
  const circleSyncMeta = useSettingsStore((s) => s.circleSyncMeta);
  const joinedIds = Object.keys(circleSyncMeta).map(Number);
  const [circles, setCircles] = useState<CircleWithStats[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [joinVisible, setJoinVisible] = useState(false);
  const [code, setCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmDialogOptions | null>(null);

  const refresh = useCallback(async () => {
    setCircles(await listCircles());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const submit = async () => {
    if (!name.trim()) return;
    const id = await createCircle(name);
    setName('');
    setModalVisible(false);
    router.push({ pathname: '/circle/[id]', params: { id: String(id) } });
  };

  const submitJoin = async () => {
    const trimmed = code.trim().toLowerCase();
    if (!validateShareCode(trimmed)) {
      setJoinError(t('cloud.invalidCode'));
      return;
    }
    const { cloudWorkerUrl, shareCodes, setShareCode, setCircleSyncMeta } = useSettingsStore.getState();
    const url = cloudWorkerUrl.trim() || DEFAULT_CLOUD_WORKER_URL;
    if (Object.values(shareCodes).includes(trimmed)) {
      setJoinError(t('cloud.alreadyJoined'));
      return;
    }
    setJoinBusy(true);
    setJoinError(null);
    try {
      const snapshot = await pullCloudSync(url, trimmed);
      const id = await createCircle(snapshot.circleName);
      await syncCircleFromSnapshot(id, snapshot, null);
      setShareCode(id, trimmed);
      setCircleSyncMeta(id, { remoteCircleId: snapshot.circleId, lastSyncedAt: snapshot.syncedAt });
      setCode('');
      setJoinVisible(false);
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'cloud.pullFailed';
      console.error('[HomeScreen] join failed:', msg);
      setJoinError(msg.startsWith('cloud.') ? t(msg) : msg);
    } finally {
      setJoinBusy(false);
    }
  };

  const confirmDelete = (circle: CircleWithStats) => {
    setConfirm({
      title: t('circle.deleteTitle'),
      message: t('circle.deleteMsg', { name: circle.name }),
      confirmText: t('common.delete'),
      destructive: true,
      icon: 'trash-outline',
      onConfirm: async () => {
        const { cloudWorkerUrl, circleSyncMeta, removeShareCode, removeCircleSyncMeta } = useSettingsStore.getState();
        const meta = circleSyncMeta[circle.id];
        const isJoined = meta?.remoteCircleId != null;
        if (!isJoined) {
          const url = cloudWorkerUrl.trim() || DEFAULT_CLOUD_WORKER_URL;
          deleteCloudCircle(url, circle.id);
        }
        removeShareCode(circle.id);
        removeCircleSyncMeta(circle.id);
        await purgeSyncMapForCircle(circle.id);
        await deleteCircle(circle.id);
        refresh();
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <View className="flex-row items-end justify-between px-5 pb-4 pt-6">
        <View className="min-w-0">
          <Text className="text-3xl font-extrabold tracking-tight text-ink dark:text-ink-dark">RemiScore</Text>
          <Text className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">{t('home.tagline')}</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => setJoinVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('cloud.join')}
            className="mr-3 h-11 w-11 items-center justify-center rounded-full border border-accent/40 bg-accent-soft dark:border-accent-dark/70 dark:bg-accent-dark-soft"
          >
            <Ionicons name="cloud-download-outline" size={20} className="text-accent dark:text-accent-dark" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            className="mr-3 h-11 w-11 items-center justify-center rounded-full border border-rule bg-surface-alt dark:border-white/25 dark:bg-white/10"
          >
            <Ionicons name="settings-outline" size={20} className="text-ink dark:text-ink-dark" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('home.newCircle')}
            className="h-11 w-11 items-center justify-center rounded-full bg-accent dark:bg-accent-dark"
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="mb-3 mt-2 px-1 text-xs font-bold uppercase tracking-widest text-ink-muted dark:text-ink-dark-muted">
          {t('home.circles')}
        </Text>

        {circles.length === 0 ? (
          <EmptyState icon="people-outline" message={t('home.noCircles')} />
        ) : (
          circles.map((circle) => (
            <TouchableOpacity
              key={circle.id}
              onPress={() => router.push({ pathname: '/circle/[id]', params: { id: String(circle.id) } })}
              onLongPress={() => confirmDelete(circle)}
              accessibilityRole="button"
              className="mb-3 flex-row items-center rounded-2xl border border-rule bg-surface-alt p-4 shadow-soft active:opacity-80 dark:border-white/12 dark:bg-surface-dark-alt dark:shadow-none"
            >
              <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft dark:bg-accent-dark-soft">
                <Ionicons name="people" size={22} className="text-accent dark:text-accent-dark" />
              </View>
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-base font-bold text-ink dark:text-ink-dark" numberOfLines={1}>
                    {circle.name}
                  </Text>
                  {joinedIds.includes(circle.id) && (
                    <Ionicons name="cloud" size={13} className="text-accent dark:text-accent-dark" />
                  )}
                </View>
                <Text className="mt-0.5 text-xs text-ink-muted dark:text-ink-dark-muted" numberOfLines={1}>
                  {t(circle.stats.sessionCount === 1 ? 'home.sessionsOne' : 'home.sessions', {
                    count: circle.stats.sessionCount,
                  })}
                  {circle.stats.lastActivityAt
                    ? ` · ${t('home.lastActivity', { date: formatDate(circle.stats.lastActivityAt) })}`
                    : ''}
                </Text>
              </View>
              <View className="ml-2 h-7 w-7 items-center justify-center rounded-full bg-ink/5 dark:bg-ink-dark/10">
                <Ionicons name="chevron-forward" size={16} className="text-ink-muted dark:text-ink-dark-muted" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/50 px-8" onPress={() => setModalVisible(false)}>
          <Pressable
            className="w-full rounded-[28px] border border-rule bg-surface-alt p-6 dark:border-rule-dark dark:bg-surface-dark-alt"
            onPress={() => {}}
          >
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft dark:bg-accent-dark-soft">
              <Ionicons name="people" size={22} className="text-accent dark:text-accent-dark" />
            </View>
            <Text className="text-lg font-extrabold tracking-tight text-ink dark:text-ink-dark">{t('home.newCircle')}</Text>
            <Text className="mb-4 mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">{t('home.newCircleHint')}</Text>
            <TextInput
              className="mb-4 rounded-xl bg-surface-fill px-4 py-4 text-base text-ink placeholder:text-ink-faint dark:bg-surface-dark-fill dark:text-ink-dark dark:placeholder:text-ink-dark-faint"
              placeholder={t('home.circleName')}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submit}
            />
            <TouchableOpacity
              onPress={submit}
              disabled={!name.trim()}
              accessibilityRole="button"
              className="items-center rounded-full bg-accent py-4 opacity-100 disabled:opacity-40 dark:bg-accent-dark"
            >
              <Text className="text-base font-extrabold text-white">{t('home.create')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={joinVisible} animationType="fade" onRequestClose={() => setJoinVisible(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/50 px-8" onPress={() => setJoinVisible(false)}>
          <Pressable
            className="w-full rounded-[28px] border border-rule bg-surface-alt p-6 dark:border-rule-dark dark:bg-surface-dark-alt"
            onPress={() => {}}
          >
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft dark:bg-accent-dark-soft">
              <Ionicons name="cloud-download-outline" size={22} className="text-accent dark:text-accent-dark" />
            </View>
            <Text className="text-lg font-extrabold tracking-tight text-ink dark:text-ink-dark">{t('cloud.join')}</Text>
            <Text className="mb-4 mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">{t('cloud.joinHint')}</Text>
            <TextInput
              className="mb-4 rounded-xl bg-surface-fill px-4 py-4 text-left text-lg font-extrabold uppercase tracking-[0.3em] text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-faint dark:bg-surface-dark-fill dark:text-ink-dark dark:placeholder:text-ink-dark-faint"
              placeholder={t('cloud.codePlaceholder')}
              value={code}
              onChangeText={(v) => setCode(v.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 6))}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={submitJoin}
              editable={!joinBusy}
            />
            {joinError != null && <Text className="mb-3 text-xs text-bad dark:text-bad-dark">{joinError}</Text>}
            <TouchableOpacity
              onPress={submitJoin}
              disabled={joinBusy || code.length !== 6}
              accessibilityRole="button"
              className="items-center rounded-full bg-accent py-4 opacity-100 disabled:opacity-40 dark:bg-accent-dark"
            >
              {joinBusy ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-base font-extrabold text-white">{t('cloud.joinConfirm')}</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </SafeAreaView>
  );
}
