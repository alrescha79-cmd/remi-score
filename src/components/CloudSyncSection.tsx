import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { getCircle, listCircles } from '@/db/circleRepo';
import { syncCircleFromSnapshot } from '@/db/cloudSyncRepo';
import { pullCloudSync, syncCircleToCloud } from '@/lib/cloudSync';
import { DEFAULT_CLOUD_WORKER_URL, generateShareCode } from '@/lib/cloudSyncCore';
import { formatDateTime } from '@/lib/format';
import { t, useT } from '@/lib/i18n';
import { useSettingsStore, type CloudSyncMode } from '@/store/settingsStore';
import type { CircleWithStats } from '@/db/models';

type Busy = 'sync' | 'pull' | 'test' | null;

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

  const circleSyncMeta = useSettingsStore((s) => s.circleSyncMeta);

  useEffect(() => {
    listCircles().then((c) => {
      setCircles(c);
      if (c.length > 0) setSelectedCircleId((prev) => prev ?? c[0].id);
    });
  }, []);

  useEffect(() => {
    if (cloudSyncMode === 'off' || !selectedCircleId) return;
    if (!useSettingsStore.getState().shareCodes[selectedCircleId]) {
      setShareCode(selectedCircleId, generateShareCode());
    }
  }, [cloudSyncMode, selectedCircleId]);

  const code = selectedCircleId ? shareCodes[selectedCircleId] : undefined;
  const shareUrl = code ? `${DEFAULT_CLOUD_WORKER_URL.replace(/\/$/, '')}/c/${code}` : null;
  const meta = selectedCircleId ? circleSyncMeta[selectedCircleId] : undefined;
  const isJoined = meta?.remoteCircleId != null;

  const getLastSyncedAt = () =>
    selectedCircleId ? (circleSyncMeta[selectedCircleId]?.lastSyncedAt ?? null) : null;

  const setLastSyncedAt = (syncedAt: string) => {
    if (!selectedCircleId) return;
    const st = useSettingsStore.getState();
    st.setCircleSyncMeta(selectedCircleId, { ...st.circleSyncMeta[selectedCircleId], lastSyncedAt: syncedAt });
  };

  const handleSync = async () => {
    if (busy || !selectedCircleId || !code) return;
    setBusy('sync');
    setError(null);
    setDone(false);
    try {
      const circle = await getCircle(selectedCircleId);
      await syncCircleToCloud({
        url: DEFAULT_CLOUD_WORKER_URL,
        circleId: selectedCircleId,
        shareCode: code,
        circleName: circle?.name ?? '',
        remoteCircleId: meta?.remoteCircleId,
        getLastSyncedAt,
        setLastSyncedAt,
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

  const handlePull = async () => {
    if (busy || !selectedCircleId || !code) return;
    setBusy('pull');
    setError(null);
    setDone(false);
    try {
      const snapshot = await pullCloudSync(DEFAULT_CLOUD_WORKER_URL, code);
      await syncCircleFromSnapshot(selectedCircleId, snapshot, getLastSyncedAt());
      setLastSyncedAt(snapshot.syncedAt);
      setLastCloudSyncAt(new Date().toISOString());
      setDone(true);
    } catch (e) {
      console.error('[CloudSyncSection] handlePull failed:', e);
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

  const handleCopyCode = useCallback(async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

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
                  <TouchableOpacity
                    onPress={handleCopyCode}
                    accessibilityRole="button"
                    accessibilityLabel={t('cloud.shareCode')}
                    className="mt-2 rounded-2xl border-2 border-accent/40 bg-surface-fill p-4 dark:border-accent-dark/50 dark:bg-surface-dark-fill"
                  >
                    <Text className="text-center text-xs font-bold uppercase tracking-widest text-ink-muted dark:text-ink-dark-muted">
                      {t('cloud.shareCode')}
                    </Text>
                    <Text className="mt-1.5 text-center text-3xl font-extrabold tracking-[0.35em] text-accent-deep dark:text-accent-dark-deep">
                      {code.toUpperCase()}
                    </Text>
                    <View className="mt-2 flex-row items-center justify-center gap-1">
                      <Ionicons
                        name={copied ? 'checkmark' : 'copy-outline'}
                        size={13}
                        className={copied ? 'text-good dark:text-good-dark' : 'text-ink-muted dark:text-ink-dark-muted'}
                      />
                      <Text
                        className={`text-xs font-bold ${
                          copied
                            ? 'text-good dark:text-good-dark'
                            : 'text-ink-muted dark:text-ink-dark-muted'
                        }`}
                      >
                        {copied ? t('cloud.copied') : t('cloud.tapToCopy')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {shareUrl && (
                    <TouchableOpacity
                      onPress={handleCopy}
                      className="mt-1 flex-row items-center gap-2 rounded-xl bg-surface-fill p-3 dark:bg-surface-dark-fill"
                    >
                      <Ionicons
                        name={copied ? 'checkmark-circle' : 'copy-outline'}
                        size={16}
                        className={copied ? 'text-good dark:text-good-dark' : 'text-accent dark:text-accent-dark'}
                      />
                      <Text className="flex-1 text-xs text-ink dark:text-ink-dark" numberOfLines={1}>
                        {shareUrl}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}
            </View>
          )}
        </View>
      )}

      {/* Sync button */}
      <View className="mt-4 flex-row gap-3">
        <TouchableOpacity
          onPress={handleSync}
          disabled={busy != null || !code || cloudSyncMode === 'off'}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-full py-3 ${
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

        {isJoined && (
          <TouchableOpacity
            onPress={handlePull}
            disabled={busy != null}
            accessibilityRole="button"
            className={`flex-1 flex-row items-center justify-center gap-2 rounded-full border border-accent/40 py-3 ${
              busy ? 'opacity-40' : 'opacity-100'
            } dark:border-accent-dark/40`}
          >
            {busy === 'pull' ? (
              <ActivityIndicator size="small" color="#0071e3" />
            ) : (
              <Ionicons name="cloud-download-outline" size={16} className="text-accent dark:text-accent-dark" />
            )}
            <Text className="text-sm font-extrabold text-accent-deep dark:text-accent-dark-deep">
              {busy === 'pull' ? t('cloud.pulling') : t('cloud.pull')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

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
