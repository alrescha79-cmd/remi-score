import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useT } from '@/lib/i18n';

export type IconName = keyof typeof Ionicons.glyphMap;

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  /** Render the confirm button in the danger color (default: false). */
  destructive?: boolean;
  /** Optional icon shown above the title. */
  icon?: IconName;
  /** Tone of the icon bubble: 'accent' (default) or 'bad'. */
  iconTone?: 'accent' | 'bad';
  /** Hide the cancel button — useful for single-button alerts. */
  hideCancel?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface Props {
  options: ConfirmDialogOptions | null;
  onDismiss: () => void;
}

export default function ConfirmDialog({ options, onDismiss }: Props) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  if (!options) return null;

  const {
    title,
    message,
    confirmText,
    cancelText,
    destructive = false,
    icon,
    iconTone = destructive ? 'bad' : 'accent',
    hideCancel,
    onConfirm,
  } = options;

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
      onDismiss();
    } catch {
      // Keep the dialog open so the user can retry.
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    if (busy) return;
    onDismiss();
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={handleDismiss}>
      <Pressable className="flex-1 items-center justify-center bg-black/50 px-8" onPress={handleDismiss}>
        <Pressable className="w-full rounded-3xl bg-surface p-6 dark:bg-surface-dark-alt" onPress={() => {}}>
          {icon != null && (
            <View
              className={`mb-4 h-12 w-12 items-center justify-center rounded-2xl ${
                iconTone === 'bad' ? 'bg-bad/10' : 'bg-accent-soft dark:bg-accent-dark-soft'
              }`}
            >
              <Ionicons name={icon} size={24} color={iconTone === 'bad' ? '#dc2626' : '#6d5dfc'} />
            </View>
          )}

          <Text className="text-lg font-bold text-ink dark:text-ink-dark">{title}</Text>
          <Text className="mt-1.5 text-sm leading-relaxed text-ink-muted dark:text-ink-dark-muted">{message}</Text>

          <View className={`mt-6 flex-row ${hideCancel ? '' : 'gap-3'}`}>
            {!hideCancel && (
              <TouchableOpacity
                onPress={handleDismiss}
                disabled={busy}
                className="flex-1 items-center justify-center rounded-xl border border-ink/15 py-3.5 dark:border-ink-dark/15"
              >
                <Text className="text-base font-bold text-ink-muted dark:text-ink-dark-muted">
                  {cancelText ?? t('common.cancel')}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={busy}
              className={`flex-1 items-center justify-center rounded-xl py-3.5 ${
                destructive ? 'bg-bad' : 'bg-accent'
              } ${busy ? 'opacity-60' : ''}`}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-base font-bold text-white">{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
