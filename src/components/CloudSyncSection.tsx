import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { exportCircleData } from '@/lib/backup';
import { pushCloudSync, testCloudConnection } from '@/lib/cloudSync';
import { generateShareCode } from '@/lib/cloudSyncCore';
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
  const {
    cloudWorkerUrl,
    setCloudWorkerUrl,
    cloudSyncMode,
    setCloudSyncMode,
    lastCloudSyncAt,
    setLastCloudSyncAt,
    shareCodes,
    setShareCode,
  } = useSettingsStore();

  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [circles, setCircles] = useState<CircleWithStats[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    listCircles().then((c) => {
      setCircles(c);
      if (c.length > 0 && !selectedCircleId) setSelectedCircleId(c[0].id);
    });
  }, []);

  const urlOk = (u: string) => u.trim().startsWith('https://');
  const code = selectedCircleId ? shareCodes[selectedCircleId] : undefined;
  const shareUrl = code && cloudWorkerUrl ? `${cloudWorkerUrl.replace(/\/$/, '')}/c/${code}` : null;

  const handleGenerate = () => {
    if (!selectedCircleId) return;
    setShareCode(selectedCircleId, generateShareCode());
  };

  const handleSync = async () => {
    if (busy || !selectedCircleId || !code) return;
    if (!urlOk(cloudWorkerUrl)) {
      setError(t('cloud.invalidUrl'));
      return;
    }
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
      await pushCloudSync(cloudWorkerUrl, {
        shareCode: code,
        circleId: selectedCircleId,
        circleName: circle?.name ?? '',
        tables,
      });
      setLastCloudSyncAt(new Date().toISOString());
      setDone(true);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(null);
    }
  };

  const handleTest = async () => {
    if (busy) return;
    if (!urlOk(cloudWorkerUrl)) {
      setError(t('cloud.invalidUrl'));
      return;
    }
    setBusy('test');
    setError(null);
    setDone(false);
    try {
      await testCloudConnection(cloudWorkerUrl);
      setDone(true);
    } catch (e) {
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

      {/* Worker URL Input */}
      <View className="flex-row items-center rounded-xl bg-surface-fill dark:bg-surface-dark-fill">
        <TextInput
          value={cloudWorkerUrl}
          onChangeText={(v) => setCloudWorkerUrl(v.trim())}
          placeholder={t('cloud.workerUrlPlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          className="flex-1 px-4 py-4 text-sm text-ink placeholder:text-ink-faint dark:text-ink-dark dark:placeholder:text-ink-dark-faint"
        />
        {cloudWorkerUrl.length > 0 && (
          <TouchableOpacity onPress={() => setCloudWorkerUrl('')} hitSlop={8} className="px-4 py-4">
            <Ionicons name="close-circle" size={18} className="text-ink-faint dark:text-ink-dark-faint" />
          </TouchableOpacity>
        )}
      </View>

      {cloudWorkerUrl !== '' && (
        <View className="mt-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Ionicons name="checkmark-circle" size={13} className="text-good dark:text-good-dark" />
            <Text className="text-xs text-good dark:text-good-dark">{t('sync.urlSaved')}</Text>
          </View>
          <TouchableOpacity onPress={handleTest} disabled={busy != null} className="flex-row items-center gap-1">
            {busy === 'test' ? (
              <ActivityIndicator size="small" color="#0071e3" />
            ) : (
              <Ionicons name="link-outline" size={13} className="text-accent dark:text-accent-dark" />
            )}
            <Text className="text-xs font-bold text-accent-deep dark:text-accent-dark-deep">
              {busy === 'test' ? t('sync.testing') : t('sync.test')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sync mode toggle */}
      <Text className="mt-4 text-xs font-bold text-ink-muted dark:text-ink-dark-muted">{t('cloud.syncMode')}</Text>
      <View className="mt-1.5 flex-row rounded-xl bg-surface-fill p-1 dark:bg-surface-dark-fill">
        {MODES.map((o) => {
          const active = cloudSyncMode === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => setCloudSyncMode(o.value)}
              className={`flex-1 items-center rounded-lg py-2 ${active ? 'bg-surface-alt shadow-soft dark:bg-surface-dark-alt' : ''}`}
            >
              <Text className={`text-sm font-bold ${active ? 'text-ink dark:text-ink-dark' : 'text-ink-muted dark:text-ink-dark-muted'}`}>
                {t(o.key)}
              </Text>
            </TouchableOpacity>
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
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedCircleId(c.id)}
                  className={`rounded-full px-3 py-1.5 ${active ? 'bg-accent dark:bg-accent-dark' : 'bg-surface-fill dark:bg-surface-dark-fill'}`}
                >
                  <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-ink dark:text-ink-dark'}`}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
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
