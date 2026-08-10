import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { exportAllData, importAllData } from '@/lib/backup';
import { parseBackup } from '@/lib/backupCore';
import { fetchBackup, pushBackup, testConnection } from '@/lib/sheetSync';
import { formatDateTime } from '@/lib/format';
import { t, useT } from '@/lib/i18n';
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
    <View className="mb-6 rounded-2xl border border-rule bg-surface-alt p-4 shadow-soft dark:border-rule-dark dark:bg-surface-dark-alt dark:shadow-none">
      <Text className="text-sm font-extrabold text-ink dark:text-ink-dark">{t('settings.sheets')}</Text>
      <Text className="mb-3 mt-0.5 text-xs text-ink-muted dark:text-ink-dark-muted">{t('settings.sheetsHint')}</Text>

      <View className="flex-row items-center rounded-xl bg-surface-fill dark:bg-surface-dark-fill">
        <TextInput
          value={sheetWebhookUrl}
          onChangeText={(v) => setSheetWebhookUrl(v.trim())}
          placeholder={t('settings.sheetsUrlPlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          className="flex-1 px-4 py-4 text-sm text-ink placeholder:text-ink-faint dark:text-ink-dark dark:placeholder:text-ink-dark-faint"
        />
        {sheetWebhookUrl.length > 0 && (
          <TouchableOpacity
            onPress={() => setSheetWebhookUrl('')}
            accessibilityLabel={t('sync.clearUrl')}
            hitSlop={8}
            className="px-4 py-4"
          >
            <Ionicons name="close-circle" size={18} className="text-ink-faint dark:text-ink-dark-faint" />
          </TouchableOpacity>
        )}
      </View>

      {sheetWebhookUrl !== '' && (
        <View className="mt-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Ionicons name="checkmark-circle" size={13} className="text-good dark:text-good-dark" />
            <Text className="text-xs text-good dark:text-good-dark">{t('sync.urlSaved')}</Text>
          </View>
          <TouchableOpacity
            onPress={handleTest}
            disabled={busy != null}
            accessibilityRole="button"
            className="flex-row items-center gap-1"
          >
            {busyTest ? (
              <ActivityIndicator size="small" color="#0071e3" />
            ) : (
              <Ionicons name="link-outline" size={13} className="text-accent dark:text-accent-dark" />
            )}
            <Text className="text-xs font-bold text-accent-deep dark:text-accent-dark-deep">
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
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-full py-3 ${
            busy ? 'opacity-60' : 'opacity-100'
          } bg-accent dark:bg-accent-dark`}
        >
          {busyExport ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="cloud-upload-outline" size={16} color="#ffffff" />
          )}
          <Text className="text-sm font-extrabold text-white">
            {busyExport ? t('sync.exporting') : t('sync.export')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleImport}
          disabled={busy != null}
          accessibilityRole="button"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-accent/40 py-3 dark:border-accent-dark/40"
        >
          {busyImport ? (
            <ActivityIndicator size="small" color="#0071e3" />
          ) : (
            <Ionicons name="cloud-download-outline" size={16} className="text-accent dark:text-accent-dark" />
          )}
          <Text className="text-sm font-extrabold text-accent-deep dark:text-accent-dark-deep">
            {busyImport ? t('sync.importing') : t('sync.import')}
          </Text>
        </TouchableOpacity>
      </View>

      {error != null && <Text className="mt-2 text-xs text-bad dark:text-bad-dark">{error}</Text>}
      {done && error == null && (
        <Text className="mt-2 text-xs text-good dark:text-good-dark">
          {doneAction === 'test' ? t('sync.testOk') : t('sync.success')}
        </Text>
      )}
      <Text className="mt-2 text-xs text-ink-muted dark:text-ink-dark-muted">
        {lastSyncAt ? t('sync.lastSync', { date: formatDateTime(lastSyncAt) }) : t('sync.never')}
      </Text>

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </View>
  );
}
