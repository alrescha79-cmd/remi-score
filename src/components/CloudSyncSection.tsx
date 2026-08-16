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
import { useThemeColor } from '@/lib/theme';
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

  const ink = useThemeColor('ink');
  const inkMuted = useThemeColor('inkMuted');
  const border = useThemeColor('border');
  const surface = useThemeColor('surface');
  const surfaceElevated = useThemeColor('surfaceElevated');
  const primary = useThemeColor('primary');
  const primaryInk = useThemeColor('primaryInk');
  const good = useThemeColor('good');
  const bad = useThemeColor('bad');

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
    <View className="mb-6 rounded-brutal-lg border-2 p-4 shadow-brutal-1" style={{ borderColor: border, backgroundColor: surface }}>
      <Text className="text-sm font-extrabold" style={{ color: ink }}>{t('cloud.title')}</Text>
      <Text className="mb-3 mt-0.5 text-xs" style={{ color: inkMuted }}>{t('cloud.hint')}</Text>

      <Text className="text-xs font-bold" style={{ color: inkMuted }}>{t('cloud.syncMode')}</Text>
      <View className="mt-1.5 flex-row rounded-brutal p-1" style={{ backgroundColor: surfaceElevated }}>
        {MODES.map((o) => {
          const active = cloudSyncMode === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => setCloudSyncMode(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className="flex-1 flex-row items-center justify-center rounded-brutal py-2.5"
              style={active ? { backgroundColor: primary, borderWidth: 2, borderColor: border } : { borderWidth: 2, borderColor: 'transparent' }}
            >
              <Text className="text-sm font-bold" style={{ color: active ? primaryInk : inkMuted }}>
                {t(o.key)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {cloudSyncMode === 'auto' && (
        <Text className="mt-1 text-[11px]" style={{ color: inkMuted }}>{t('cloud.autoHint')}</Text>
      )}

      {circles.length > 0 && (
        <View className="mt-4">
          <Text className="text-xs font-bold" style={{ color: inkMuted }}>{t('cloud.selectCircle')}</Text>
          <View className="mt-1.5 flex-row flex-wrap gap-2">
            {circles.map((c) => {
              const active = selectedCircleId === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedCircleId(c.id)}
                  className="rounded-brutal px-3 py-1.5"
                  style={active ? { backgroundColor: primary, borderWidth: 2, borderColor: border } : { backgroundColor: surfaceElevated, borderWidth: 2, borderColor: border }}
                >
                  <Text className="text-xs font-bold" style={{ color: active ? primaryInk : ink }}>
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
                    className="mt-2 rounded-brutal-lg border-2 p-4"
                    style={{ borderColor: primary, backgroundColor: surfaceElevated }}
                  >
                    <Text className="text-center text-xs font-bold uppercase tracking-widest" style={{ color: inkMuted }}>
                      {t('cloud.shareCode')}
                    </Text>
                    <Text className="mt-1.5 text-center text-3xl font-extrabold tracking-[0.35em]" style={{ color: primary }}>
                      {code.toUpperCase()}
                    </Text>
                    <View className="mt-2 flex-row items-center justify-center gap-1">
                      <Ionicons
                        name={copied ? 'checkmark' : 'copy-outline'}
                        size={13}
                        color={copied ? good : inkMuted}
                      />
                      <Text
                        className="text-xs font-bold"
                        style={{ color: copied ? good : inkMuted }}
                      >
                        {copied ? t('cloud.copied') : t('cloud.tapToCopy')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {shareUrl && (
                    <TouchableOpacity
                      onPress={handleCopy}
                      className="mt-1 flex-row items-center gap-2 rounded-brutal p-3"
                      style={{ backgroundColor: surfaceElevated }}
                    >
                      <Ionicons
                        name={copied ? 'checkmark-circle' : 'copy-outline'}
                        size={16}
                        color={copied ? good : primary}
                      />
                      <Text className="flex-1 text-xs" style={{ color: ink }} numberOfLines={1}>
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

      <View className="mt-4 flex-row gap-3">
        <TouchableOpacity
          onPress={handleSync}
          disabled={busy != null || !code || cloudSyncMode === 'off'}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-brutal border-2 py-3 shadow-brutal-1"
          style={{ borderColor: border, backgroundColor: primary, opacity: busy || !code || cloudSyncMode === 'off' ? 0.4 : 1 }}
        >
          {busy === 'sync' ? (
            <ActivityIndicator size="small" color={primaryInk} />
          ) : (
            <Ionicons name="cloud-upload-outline" size={16} color={primaryInk} />
          )}
          <Text className="text-sm font-extrabold" style={{ color: primaryInk }}>
            {busy === 'sync' ? t('cloud.syncing') : t('cloud.sync')}
          </Text>
        </TouchableOpacity>

        {isJoined && (
          <TouchableOpacity
            onPress={handlePull}
            disabled={busy != null}
            accessibilityRole="button"
            className="flex-1 flex-row items-center justify-center gap-2 rounded-brutal border-2 py-3"
            style={{ borderColor: border, opacity: busy ? 0.4 : 1 }}
          >
            {busy === 'pull' ? (
              <ActivityIndicator size="small" color={primary} />
            ) : (
              <Ionicons name="cloud-download-outline" size={16} color={primary} />
            )}
            <Text className="text-sm font-extrabold" style={{ color: primary }}>
              {busy === 'pull' ? t('cloud.pulling') : t('cloud.pull')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {error != null && <Text className="mt-2 text-xs" style={{ color: bad }}>{error}</Text>}
      {done && error == null && (
        <Text className="mt-2 text-xs" style={{ color: good }}>{t('cloud.success')}</Text>
      )}
      <Text className="mt-2 text-xs" style={{ color: inkMuted }}>
        {lastCloudSyncAt ? t('cloud.lastSync', { date: formatDateTime(lastCloudSyncAt) }) : t('cloud.never')}
      </Text>
    </View>
  );
}
