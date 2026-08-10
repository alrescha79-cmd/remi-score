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
        <Pressable
          className="w-full rounded-[24px] border border-rule bg-surface-alt p-6 dark:border-white/20 dark:bg-surface-dark-alt dark:shadow-none"
          onPress={() => {}}
        >
          {icon != null && (
            <View
              className={`mb-4 h-12 w-12 items-center justify-center rounded-full ${
                iconTone === 'bad' ? 'bg-bad/10 dark:bg-bad-dark/10' : 'bg-accent-soft dark:bg-accent-dark-soft'
              }`}
            >
              <Ionicons
                name={icon}
                size={24}
                className={iconTone === 'bad' ? 'text-bad dark:text-bad-dark' : 'text-accent dark:text-accent-dark'}
              />
            </View>
          )}

          <Text className="text-lg font-extrabold tracking-tight text-ink dark:text-ink-dark">{title}</Text>
          <Text className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-dark-muted">{message}</Text>

          <View className={`mt-6 flex-row ${hideCancel ? '' : 'gap-3'}`}>
            {!hideCancel && (
              <TouchableOpacity
                onPress={handleDismiss}
                disabled={busy}
                accessibilityRole="button"
                className="flex-1 items-center justify-center rounded-full border border-rule py-4 dark:border-white/20"
              >
                <Text className="text-base font-bold text-ink dark:text-ink-dark">
                  {cancelText ?? t('common.cancel')}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={busy}
              accessibilityRole="button"
              className={`flex-1 items-center justify-center rounded-full py-4 ${
                destructive
                  ? 'bg-bad dark:bg-bad-dark'
                  : 'bg-accent dark:bg-accent-dark'
              } ${busy ? 'opacity-60' : 'opacity-100'}`}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-base font-extrabold text-white">{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
