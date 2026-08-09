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
  const { sheetWebhookUrl, setSheetWebhookUrl, lastSyncAt, setLastSyncAt } = useSettingsStore();
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
    <View className="mb-6 mt-4">
      <Text className="text-sm font-semibold text-ink-muted dark:text-ink-dark-muted">{t('settings.sheets')}</Text>
      <Text className="mb-2 text-xs text-ink-muted/70 dark:text-ink-dark-muted/70">{t('settings.sheetsHint')}</Text>

      <View className="flex-row items-center rounded-2xl bg-surface-alt dark:bg-surface-dark-alt">
        <TextInput
          value={sheetWebhookUrl}
          onChangeText={(v) => setSheetWebhookUrl(v.trim())}
          placeholder={t('settings.sheetsUrlPlaceholder')}
          placeholderTextColor="#9aa3af"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          className="flex-1 px-4 py-3 text-sm text-ink dark:text-ink-dark"
        />
        {sheetWebhookUrl.length > 0 && (
          <TouchableOpacity
            onPress={() => setSheetWebhookUrl('')}
            accessibilityLabel={t('sync.clearUrl')}
            className="px-4 py-3"
          >
            <Ionicons name="close-circle" size={18} color="#9aa3af" />
          </TouchableOpacity>
        )}
      </View>

      {sheetWebhookUrl !== '' && (
        <View className="mt-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Ionicons name="checkmark-circle" size={13} color="#16a34a" />
            <Text className="text-xs text-good">{t('sync.urlSaved')}</Text>
          </View>
          <TouchableOpacity
            onPress={handleTest}
            disabled={busy != null}
            className="flex-row items-center gap-1"
          >
            {busyTest ? (
              <ActivityIndicator size="small" color="#6d5dfc" />
            ) : (
              <Ionicons name="link-outline" size={13} color="#6d5dfc" />
            )}
            <Text className="text-xs font-semibold text-accent">
              {busyTest ? t('sync.testing') : t('sync.test')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="mt-3 flex-row gap-3">
        <TouchableOpacity
          onPress={handleExport}
          disabled={busy != null}
          className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-3 ${
            busy ? 'opacity-60' : ''
          } bg-accent`}
        >
          {busyExport ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="cloud-upload-outline" size={16} color="#ffffff" />
          )}
          <Text className="text-sm font-bold text-white">
            {busyExport ? t('sync.exporting') : t('sync.export')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleImport}
          disabled={busy != null}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-accent/40 py-3"
        >
          {busyImport ? (
            <ActivityIndicator size="small" color="#6d5dfc" />
          ) : (
            <Ionicons name="cloud-download-outline" size={16} color="#6d5dfc" />
          )}
          <Text className="text-sm font-bold text-accent">
            {busyImport ? t('sync.importing') : t('sync.import')}
          </Text>
        </TouchableOpacity>
      </View>

      {error != null && <Text className="mt-2 text-xs text-bad">{error}</Text>}
      {done && error == null && (
        <Text className="mt-2 text-xs text-good">
          {doneAction === 'test' ? t('sync.testOk') : t('sync.success')}
        </Text>
      )}
      <Text className="mt-2 text-xs text-ink-muted/70 dark:text-ink-dark-muted/70">
        {lastSyncAt ? t('sync.lastSync', { date: formatDateTime(lastSyncAt) }) : t('sync.never')}
      </Text>

      <ConfirmDialog options={confirm} onDismiss={() => setConfirm(null)} />
    </View>
  );
}
