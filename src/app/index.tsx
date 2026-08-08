import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmDialog, { type ConfirmDialogOptions } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { createCircle, deleteCircle, listCircles } from '@/db/circleRepo';
import type { CircleWithStats } from '@/db/models';
import { formatDate } from '@/lib/format';
import { useT } from '@/lib/i18n';

export default function HomeScreen() {
  const router = useRouter();
  const t = useT();
  const [circles, setCircles] = useState<CircleWithStats[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
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

  const confirmDelete = (circle: CircleWithStats) => {
    setConfirm({
      title: t('circle.deleteTitle'),
      message: t('circle.deleteMsg', { name: circle.name }),
      confirmText: t('common.delete'),
      destructive: true,
      icon: 'trash-outline',
      onConfirm: async () => {
        await deleteCircle(circle.id);
        refresh();
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pb-2 pt-4">
        <View className="flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-2xl bg-accent">
            <Ionicons name="sparkles" size={20} color="white" />
          </View>
          <View>
            <Text className="text-xl font-extrabold text-ink dark:text-ink-dark">RemiScore</Text>
            <Text className="text-xs text-ink-muted dark:text-ink-dark-muted">{t('home.tagline')}</Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            className="mr-2 h-11 w-11 items-center justify-center rounded-2xl bg-surface-alt dark:bg-surface-dark-alt"
          >
            <Ionicons name="settings-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-accent"
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="mb-2 mt-4 text-sm font-semibold text-ink-muted dark:text-ink-dark-muted">
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
              className="mb-3 flex-row items-center rounded-2xl bg-surface-alt p-4 active:opacity-80 dark:bg-surface-dark-alt"
            >
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-accent-soft dark:bg-accent-dark-soft">
                <Ionicons name="people" size={20} color="#6d5dfc" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-ink dark:text-ink-dark">{circle.name}</Text>
                <Text className="text-xs text-ink-muted dark:text-ink-dark-muted">
                  {t(circle.stats.sessionCount === 1 ? 'home.sessionsOne' : 'home.sessions', {
                    count: circle.stats.sessionCount,
                  })}
                  {circle.stats.lastActivityAt
                    ? ` · ${t('home.lastActivity', { date: formatDate(circle.stats.lastActivityAt) })}`
                    : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9aa3af" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/50 px-8" onPress={() => setModalVisible(false)}>
          <Pressable className="w-full rounded-3xl bg-surface p-6 dark:bg-surface-dark-alt" onPress={() => {}}>
            <Text className="mb-1 text-lg font-bold text-ink dark:text-ink-dark">{t('home.newCircle')}</Text>
            <Text className="mb-4 text-sm text-ink-muted dark:text-ink-dark-muted">
              {t('home.newCircleHint')}
            </Text>
            <TextInput
              className="mb-4 rounded-xl border border-ink/15 bg-surface-alt px-4 py-3 text-base text-ink dark:border-ink-dark/15 dark:bg-surface-dark dark:text-ink-dark"
              placeholder={t('home.circleName')}
              placeholderTextColor="#9aa3af"
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submit}
            />
            <TouchableOpacity
              onPress={submit}
              disabled={!name.trim()}
              className="items-center rounded-xl bg-accent py-3 opacity-100 disabled:opacity-40"
            >
              <Text className="text-base font-bold text-white">{t('home.create')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </SafeAreaView>
  );
}
