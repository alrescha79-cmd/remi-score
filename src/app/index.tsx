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
import { useThemeColor } from '@/lib/theme';
import { useSettingsStore } from '@/store/settingsStore';

export default function HomeScreen() {
  const router = useRouter();
  const t = useT();

  const bg = useThemeColor('bg');
  const surface = useThemeColor('surface');
  const surfaceElevated = useThemeColor('surfaceElevated');
  const ink = useThemeColor('ink');
  const inkMuted = useThemeColor('inkMuted');
  const border = useThemeColor('border');
  const primary = useThemeColor('primary');
  const primaryInk = useThemeColor('primaryInk');
  const inkFaint = useThemeColor('inkFaint');
  const bad = useThemeColor('bad');

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
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <View className="flex-row items-end justify-between px-5 pb-4 pt-6">
        <View className="min-w-0">
          <Text className="text-3xl font-extrabold tracking-tight" style={{ color: ink }}>RemiScore</Text>
          <Text className="mt-1 text-sm" style={{ color: inkMuted }}>{t('home.tagline')}</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => setJoinVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('home.join')}
            className="mr-3 h-11 w-11 items-center justify-center rounded-brutal border-2"
            style={{ borderColor: border, backgroundColor: surface }}
          >
            <Ionicons name="cloud-download-outline" size={20} color={primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel={t('home.settings')}
            className="mr-3 h-11 w-11 items-center justify-center rounded-brutal border-2"
            style={{ borderColor: border, backgroundColor: surface }}
          >
            <Ionicons name="settings-outline" size={20} color={ink} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('home.newCircle')}
            className="h-11 w-11 items-center justify-center rounded-brutal border-2 shadow-brutal-1"
            style={{ borderColor: border, backgroundColor: primary }}
          >
            <Ionicons name="add" size={24} color={primaryInk} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="mb-3 mt-2 px-1 text-xs font-bold uppercase tracking-widest" style={{ color: inkMuted }}>
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
              className="mb-3 flex-row items-center rounded-brutal-lg border-2 p-4 shadow-brutal-1 active:opacity-80"
              style={{ borderColor: border, backgroundColor: surface }}
            >
              <View className="mr-4 h-12 w-12 items-center justify-center rounded-brutal border-2" style={{ borderColor: border, backgroundColor: surfaceElevated }}>
                <Ionicons name="people" size={22} color={primary} />
              </View>
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-base font-bold" style={{ color: ink }} numberOfLines={1}>
                    {circle.name}
                  </Text>
                  {joinedIds.includes(circle.id) && (
                    <Ionicons name="cloud" size={13} color={primary} />
                  )}
                </View>
                <Text className="mt-0.5 text-xs" style={{ color: inkMuted }} numberOfLines={1}>
                  {circle.stats.sessionCount} {t(circle.stats.sessionCount === 1 ? 'home.sessionsOne' : 'home.sessions')}
                  {circle.stats.lastActivityAt
                    ? ` · ${t('home.lastActivity', { date: formatDate(circle.stats.lastActivityAt) })}`
                    : ''}
                </Text>
              </View>
              <View className="ml-2 h-7 w-7 items-center justify-center rounded-full border" style={{ borderColor: border, backgroundColor: surfaceElevated }}>
                <Ionicons name="chevron-forward" size={16} color={inkMuted} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/50 px-8" onPress={() => setModalVisible(false)}>
          <Pressable
            className="w-full rounded-brutal-xl border-2 p-6 shadow-brutal-2"
            style={{ borderColor: border, backgroundColor: surface }}
            onPress={() => {}}
          >
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-brutal border-2" style={{ borderColor: border, backgroundColor: surfaceElevated }}>
              <Ionicons name="people" size={22} color={primary} />
            </View>
            <Text className="text-lg font-extrabold tracking-tight" style={{ color: ink }}>{t('home.newCircle')}</Text>
            <Text className="mb-4 mt-1 text-sm" style={{ color: inkMuted }}>{t('home.newCircleHint')}</Text>
            <TextInput
              className="mb-4 rounded-brutal border-2 px-4 py-4 text-base"
              style={{ borderColor: border, backgroundColor: surface, color: ink }}
              placeholder={t('home.circleName')}
              placeholderTextColor={inkFaint}
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
              className="items-center rounded-brutal border-2 py-4 shadow-brutal-1"
              style={{ borderColor: border, backgroundColor: primary, opacity: name.trim() ? 1 : 0.4 }}
            >
              <Text className="text-base font-extrabold" style={{ color: primaryInk }}>{t('home.create')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={joinVisible} animationType="fade" onRequestClose={() => setJoinVisible(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/50 px-8" onPress={() => setJoinVisible(false)}>
          <Pressable
            className="w-full rounded-brutal-xl border-2 p-6 shadow-brutal-2"
            style={{ borderColor: border, backgroundColor: surface }}
            onPress={() => {}}
          >
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-brutal border-2" style={{ borderColor: border, backgroundColor: surfaceElevated }}>
              <Ionicons name="cloud-download-outline" size={22} color={primary} />
            </View>
            <Text className="text-lg font-extrabold tracking-tight" style={{ color: ink }}>{t('cloud.join')}</Text>
            <Text className="mb-4 mt-1 text-sm" style={{ color: inkMuted }}>{t('cloud.joinHint')}</Text>
            <TextInput
              className="mb-4 rounded-brutal border-2 px-4 py-4 text-left text-lg font-extrabold uppercase tracking-[0.3em]"
              style={{ borderColor: border, backgroundColor: surface, color: ink }}
              placeholder={t('cloud.codePlaceholder')}
              placeholderTextColor={inkFaint}
              value={code}
              onChangeText={(v) => setCode(v.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 6))}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={submitJoin}
              editable={!joinBusy}
            />
            {joinError != null && <Text className="mb-3 text-xs" style={{ color: bad }}>{joinError}</Text>}
            <TouchableOpacity
              onPress={submitJoin}
              disabled={joinBusy || code.length !== 6}
              accessibilityRole="button"
              className="items-center rounded-brutal border-2 py-4 shadow-brutal-1"
              style={{ borderColor: border, backgroundColor: primary, opacity: joinBusy || code.length !== 6 ? 0.4 : 1 }}
            >
              {joinBusy ? (
                <ActivityIndicator size="small" color={primaryInk} />
              ) : (
                <Text className="text-base font-extrabold" style={{ color: primaryInk }}>{t('cloud.joinConfirm')}</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </SafeAreaView>
  );
}
