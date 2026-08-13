import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { exportAllData, importAllData } from '@/lib/backup';
import { parseBackup } from '@/lib/backupCore';
import { fetchBackup, pushBackup, testConnection } from '@/lib/sheetSync';
import { formatDateTime } from '@/lib/format';
import { t, useT } from '@/lib/i18n';
import { useThemeColor } from '@/lib/theme';
import { useSettingsStore } from '@/store/settingsStore';
import ConfirmDialog, { type ConfirmDialogOptions } from './ConfirmDialog';

type Busy = 'export' | 'import' | 'test' | null;

function errText(e: unknown): string {
  const msg = e instanceof Error ? e.message : 'sync.error';
  if (msg.startsWith('sync.scriptError:')) return msg.slice('sync.scriptError:'.length);
  if (msg.startsWith('sync.') || msg.startsWith('backup.')) return t(msg);
  return t('sync.error');
}

export default function SheetSyncSection() {
  const t = useT();
  const sheetWebhookUrl = useSettingsStore((s) => s.sheetWebhookUrl);
  const setSheetWebhookUrl = useSettingsStore((s) => s.setSheetWebhookUrl);
  const lastSyncAt = useSettingsStore((s) => s.lastSyncAt);
  const setLastSyncAt = useSettingsStore((s) => s.setLastSyncAt);

  const ink = useThemeColor('ink');
  const inkMuted = useThemeColor('inkMuted');
  const border = useThemeColor('border');
  const surface = useThemeColor('surface');
  const primary = useThemeColor('primary');
  const primaryInk = useThemeColor('primaryInk');
  const good = useThemeColor('good');
  const bad = useThemeColor('bad');
  const inkFaint = useThemeColor('inkFaint');

  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [doneAction, setDoneAction] = useState<Exclude<Busy, null> | null>(null);
  const [confirm, setConfirm] = useState<ConfirmDialogOptions | null>(null);

  const webhookOk = (u: string) => u.trim().startsWith('https://');

  const handleExport = async () => {
    if (busy) return;
    const u = sheetWebhookUrl;
    if (!webhookOk(u)) {
      setError(t('sync.invalidUrl'));
      return;
    }
    setBusy('export');
    setError(null);
    setDone(false);
    try {
      const payload = await exportAllData();
      await pushBackup(u, payload);
      setLastSyncAt(new Date().toISOString());
      setDoneAction('export');
      setDone(true);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    setBusy('import');
    setError(null);
    setDone(false);
    try {
      const raw = await fetchBackup(sheetWebhookUrl);
      const payload = parseBackup(raw);
      await importAllData(payload);
      setLastSyncAt(new Date().toISOString());
      setDoneAction('import');
      setDone(true);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(null);
    }
  };

  const handleImport = () => {
    if (busy) return;
    const u = sheetWebhookUrl;
    if (!webhookOk(u)) {
      setError(t('sync.invalidUrl'));
      return;
    }
    setConfirm({
      title: t('sync.importTitle'),
      message: t('sync.importMsg'),
      confirmText: t('sync.importConfirm'),
      destructive: true,
      icon: 'cloud-download-outline',
      onConfirm: doImport,
    });
  };

  const handleTest = async () => {
    if (busy) return;
    const u = sheetWebhookUrl;
    if (!webhookOk(u)) {
      setError(t('sync.invalidUrl'));
      return;
    }
    setBusy('test');
    setError(null);
    setDone(false);
    try {
      await testConnection(u);
      setDoneAction('test');
      setDone(true);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(null);
    }
  };

  const busyExport = busy === 'export';
  const busyImport = busy === 'import';
  const busyTest = busy === 'test';

  return (
    <View className="mb-6 rounded-brutal-lg border-2 p-4 shadow-brutal-1" style={{ borderColor: border, backgroundColor: surface }}>
      <Text className="text-sm font-extrabold" style={{ color: ink }}>{t('settings.sheets')}</Text>
      <Text className="mb-3 mt-0.5 text-xs" style={{ color: inkMuted }}>{t('settings.sheetsHint')}</Text>

      <View className="flex-row items-center rounded-brutal border-2" style={{ borderColor: border }}>
        <TextInput
          value={sheetWebhookUrl}
          onChangeText={(v) => setSheetWebhookUrl(v.trim())}
          placeholder={t('settings.sheetsUrlPlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          className="flex-1 px-4 py-4 text-sm"
          style={{ color: ink }}
          placeholderTextColor={inkFaint}
        />
        {sheetWebhookUrl.length > 0 && (
          <TouchableOpacity
            onPress={() => setSheetWebhookUrl('')}
            accessibilityLabel={t('sync.clearUrl')}
            hitSlop={8}
            className="px-4 py-4"
          >
            <Ionicons name="close-circle" size={18} color={inkFaint} />
          </TouchableOpacity>
        )}
      </View>

      {sheetWebhookUrl !== '' && (
        <View className="mt-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Ionicons name="checkmark-circle" size={13} color={good} />
            <Text className="text-xs" style={{ color: good }}>{t('sync.urlSaved')}</Text>
          </View>
          <TouchableOpacity
            onPress={handleTest}
            disabled={busy != null}
            accessibilityRole="button"
            className="flex-row items-center gap-1"
          >
            {busyTest ? (
              <ActivityIndicator size="small" color={primary} />
            ) : (
              <Ionicons name="link-outline" size={13} color={primary} />
            )}
            <Text className="text-xs font-bold" style={{ color: primary }}>
              {busyTest ? t('sync.testing') : t('sync.test')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="mt-3 flex-row gap-3">
        <TouchableOpacity
          onPress={handleExport}
          disabled={busy != null}
          accessibilityRole="button"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-brutal border-2 py-3 shadow-brutal-1"
          style={{ borderColor: border, backgroundColor: primary, opacity: busy ? 0.6 : 1 }}
        >
          {busyExport ? (
            <ActivityIndicator size="small" color={primaryInk} />
          ) : (
            <Ionicons name="cloud-upload-outline" size={16} color={primaryInk} />
          )}
          <Text className="text-sm font-extrabold" style={{ color: primaryInk }}>
            {busyExport ? t('sync.exporting') : t('sync.export')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleImport}
          disabled={busy != null}
          accessibilityRole="button"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-brutal border-2 py-3"
          style={{ borderColor: border }}
        >
          {busyImport ? (
            <ActivityIndicator size="small" color={primary} />
          ) : (
            <Ionicons name="cloud-download-outline" size={16} color={primary} />
          )}
          <Text className="text-sm font-extrabold" style={{ color: primary }}>
            {busyImport ? t('sync.importing') : t('sync.import')}
          </Text>
        </TouchableOpacity>
      </View>

      {error != null && <Text className="mt-2 text-xs" style={{ color: bad }}>{error}</Text>}
      {done && error == null && (
        <Text className="mt-2 text-xs" style={{ color: good }}>
          {doneAction === 'test' ? t('sync.testOk') : t('sync.success')}
        </Text>
      )}
      <Text className="mt-2 text-xs" style={{ color: inkMuted }}>
        {lastSyncAt ? t('sync.lastSync', { date: formatDateTime(lastSyncAt) }) : t('sync.never')}
      </Text>

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </View>
  );
}
