import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { exportCircleData } from '@/lib/backup';
import { pushCloudSync } from '@/lib/cloudSync';
import { DEFAULT_CLOUD_WORKER_URL, generateShareCode } from '@/lib/cloudSyncCore';
import { formatDateTime } from '@/lib/format';
import { t, useT } from '@/lib/i18n';
import { getDb } from '@/db/database';
import { listCircles } from '@/db/circleRepo';
import { useSettingsStore, type CloudSyncMode } from '@/store/settingsStore';
import type { CircleWithStats } from '@/db/models';

type Busy = 'sync' | 'test' | null;

const MODES: { value: CloudSyncMode; key: string }[] = [
  { value: 'off', key: 'cloud.off' },
  { value: 'manual', key: 'cloud.manual' },
  { value: 'auto', key: 'cloud.auto' },
];

function errText(e: unknown): string {
  const msg = e instanceof Error ? e.message : 'cloud.pushFailed';
  if (msg.startsWith('cloud.')) return t(msg);
  return t('cloud.pushFailed');
}

export default function CloudSyncSection() {
  const t = useT();
  const cloudSyncMode = useSettingsStore((s) => s.cloudSyncMode);
  const setCloudSyncMode = useSettingsStore((s) => s.setCloudSyncMode);
  const lastCloudSyncAt = useSettingsStore((s) => s.lastCloudSyncAt);
  const setLastCloudSyncAt = useSettingsStore((s) => s.setLastCloudSyncAt);
  const shareCodes = useSettingsStore((s) => s.shareCodes);
  const setShareCode = useSettingsStore((s) => s.setShareCode);

  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [circles, setCircles] = useState<CircleWithStats[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    listCircles().then((c) => {
      setCircles(c);
      if (c.length > 0) setSelectedCircleId((prev) => prev ?? c[0].id);
    });
  }, []);

  const code = selectedCircleId ? shareCodes[selectedCircleId] : undefined;
  const shareUrl = code ? `${DEFAULT_CLOUD_WORKER_URL.replace(/\/$/, '')}/c/${code}` : null;

  const handleGenerate = () => {
    if (!selectedCircleId) return;
    setShareCode(selectedCircleId, generateShareCode());
  };

  const handleSync = async () => {
    if (busy || !selectedCircleId || !code) return;
    setBusy('sync');
    setError(null);
    setDone(false);
    try {
      const tables = await exportCircleData(selectedCircleId);
      const db = await getDb();
      const circle = await db.getFirstAsync<{ name: string }>(
        'SELECT name FROM circles WHERE id = ?',
        selectedCircleId
      );
      await pushCloudSync(DEFAULT_CLOUD_WORKER_URL, {
        shareCode: code,
        circleId: selectedCircleId,
        circleName: circle?.name ?? '',
        tables,
      });
      setLastCloudSyncAt(new Date().toISOString());
      setDone(true);
    } catch (e) {
      console.error('[CloudSyncSection] handleSync failed:', e);
      setError(errText(e));
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  return (
    <View className="mb-6 rounded-2xl border border-rule bg-surface-alt p-4 shadow-soft dark:border-rule-dark dark:bg-surface-dark-alt dark:shadow-none">
      <Text className="text-sm font-extrabold text-ink dark:text-ink-dark">{t('cloud.title')}</Text>
      <Text className="mb-3 mt-0.5 text-xs text-ink-muted dark:text-ink-dark-muted">{t('cloud.hint')}</Text>

      {/* Sync mode toggle */}
      <Text className="text-xs font-bold text-ink-muted dark:text-ink-dark-muted">{t('cloud.syncMode')}</Text>
      <View className="mt-1.5 flex-row rounded-xl bg-surface-fill p-1.5 dark:bg-surface-dark-fill">
        {MODES.map((o) => {
          const active = cloudSyncMode === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => setCloudSyncMode(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg py-2.5 ${
                active ? 'bg-accent dark:bg-accent-dark' : 'bg-transparent'
              }`}
            >
              <Text className={`text-sm font-bold ${active ? 'text-white' : 'text-ink-muted dark:text-ink-dark-muted'}`}>
                {t(o.key)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {cloudSyncMode === 'auto' && (
        <Text className="mt-1 text-[11px] text-ink-faint dark:text-ink-dark-faint">{t('cloud.autoHint')}</Text>
      )}

      {/* Circle selector + share code */}
      {circles.length > 0 && (
        <View className="mt-4">
          <Text className="text-xs font-bold text-ink-muted dark:text-ink-dark-muted">{t('cloud.selectCircle')}</Text>
          <View className="mt-1.5 flex-row flex-wrap gap-2">
            {circles.map((c) => {
              const active = selectedCircleId === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedCircleId(c.id)}
                  className={`rounded-full px-3 py-1.5 ${active ? 'bg-accent dark:bg-accent-dark' : 'bg-surface-fill dark:bg-surface-dark-fill'}`}
                >
                  <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-ink dark:text-ink-dark'}`}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selectedCircleId && (
            <View className="mt-3">
              {code ? (
                <View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-bold text-ink-muted dark:text-ink-dark-muted">
                      {t('cloud.shareCode')}: <Text className="font-extrabold text-ink dark:text-ink-dark">{code}</Text>
                    </Text>
                    <TouchableOpacity onPress={handleGenerate} hitSlop={8}>
                      <Ionicons name="refresh-outline" size={16} className="text-accent dark:text-accent-dark" />
                    </TouchableOpacity>
                  </View>
                  {shareUrl && (
                    <TouchableOpacity
                      onPress={handleCopy}
                      className="mt-2 flex-row items-center gap-2 rounded-xl bg-surface-fill p-3 dark:bg-surface-dark-fill"
                    >
                      <Ionicons
                        name={copied ? 'checkmark-circle' : 'copy-outline'}
                        size={16}
                        className={copied ? 'text-good dark:text-good-dark' : 'text-accent dark:text-accent-dark'}
                      />
                      <Text className="flex-1 text-xs text-ink dark:text-ink-dark" numberOfLines={1}>
                        {shareUrl}
                      </Text>
                      {copied && (
                        <Text className="text-xs font-bold text-good dark:text-good-dark">{t('cloud.copied')}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity onPress={handleGenerate} className="flex-row items-center gap-2">
                  <Ionicons name="add-circle-outline" size={16} className="text-accent dark:text-accent-dark" />
                  <Text className="text-xs font-bold text-accent-deep dark:text-accent-dark-deep">
                    {t('cloud.generateCode')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Sync button */}
      <TouchableOpacity
        onPress={handleSync}
        disabled={busy != null || !code || cloudSyncMode === 'off'}
        className={`mt-4 flex-row items-center justify-center gap-2 rounded-full py-3 ${
          busy || !code || cloudSyncMode === 'off' ? 'opacity-40' : 'opacity-100'
        } bg-accent dark:bg-accent-dark`}
      >
        {busy === 'sync' ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Ionicons name="cloud-upload-outline" size={16} color="#ffffff" />
        )}
        <Text className="text-sm font-extrabold text-white">
          {busy === 'sync' ? t('cloud.syncing') : t('cloud.sync')}
        </Text>
      </TouchableOpacity>

      {error != null && <Text className="mt-2 text-xs text-bad dark:text-bad-dark">{error}</Text>}
      {done && error == null && (
        <Text className="mt-2 text-xs text-good dark:text-good-dark">{t('cloud.success')}</Text>
      )}
      <Text className="mt-2 text-xs text-ink-muted dark:text-ink-dark-muted">
        {lastCloudSyncAt ? t('cloud.lastSync', { date: formatDateTime(lastCloudSyncAt) }) : t('cloud.never')}
      </Text>
    </View>
  );
}
