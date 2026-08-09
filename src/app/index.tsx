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
      <View className="flex-row items-end justify-between px-5 pb-4 pt-6">
        <View className="min-w-0">
          <Text className="text-3xl font-extrabold tracking-tight text-ink dark:text-ink-dark">RemiScore</Text>
          <Text className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">{t('home.tagline')}</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            className="mr-3 h-11 w-11 items-center justify-center rounded-full border border-rule bg-surface-alt dark:border-rule-dark dark:bg-surface-dark-alt"
          >
            <Ionicons name="settings-outline" size={20} className="text-ink-faint dark:text-ink-dark-faint" />
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
              className="mb-3 flex-row items-center rounded-2xl border border-rule bg-surface-alt p-4 shadow-soft active:opacity-80 dark:border-rule-dark dark:bg-surface-dark-alt dark:shadow-none"
            >
              <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft dark:bg-accent-dark-soft">
                <Ionicons name="people" size={22} className="text-accent dark:text-accent-dark" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-base font-bold text-ink dark:text-ink-dark" numberOfLines={1}>
                  {circle.name}
                </Text>
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
                <Ionicons name="chevron-forward" size={16} className="text-ink-faint dark:text-ink-dark-faint" />
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

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </SafeAreaView>
  );
}
