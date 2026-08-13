import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useT } from '@/lib/i18n';
import { useThemeColor } from '@/lib/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
  icon?: IconName;
  iconTone?: 'accent' | 'bad';
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

  const surface = useThemeColor('surface');
  const surfaceElevated = useThemeColor('surfaceElevated');
  const ink = useThemeColor('ink');
  const inkMuted = useThemeColor('inkMuted');
  const border = useThemeColor('border');
  const primary = useThemeColor('primary');
  const primaryInk = useThemeColor('primaryInk');
  const bad = useThemeColor('bad');
  const badInk = useThemeColor('badInk');

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

  const iconColor = iconTone === 'bad' ? bad : primary;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={handleDismiss}>
      <Pressable className="flex-1 items-center justify-center bg-black/50 px-8" onPress={handleDismiss}>
        <Pressable
          className="w-full rounded-brutal-xl border-2 p-6 shadow-brutal-2"
          style={{ borderColor: border, backgroundColor: surface }}
          onPress={() => {}}
        >
          {icon != null && (
            <View
              className="mb-4 h-12 w-12 items-center justify-center rounded-brutal border-2"
              style={{ borderColor: border, backgroundColor: surfaceElevated }}
            >
              <Ionicons name={icon} size={24} color={iconColor} />
            </View>
          )}

          <Text className="text-lg font-extrabold tracking-tight" style={{ color: ink }}>{title}</Text>
          <Text className="mt-2 text-sm leading-relaxed" style={{ color: inkMuted }}>{message}</Text>

          <View className={`mt-6 flex-row ${hideCancel ? '' : 'gap-3'}`}>
            {!hideCancel && (
              <TouchableOpacity
                onPress={handleDismiss}
                disabled={busy}
                accessibilityRole="button"
                className="flex-1 items-center justify-center rounded-brutal border-2 py-4"
                style={{ borderColor: border }}
              >
                <Text className="text-base font-bold" style={{ color: ink }}>
                  {cancelText ?? t('common.cancel')}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={busy}
              accessibilityRole="button"
              className="flex-1 items-center justify-center rounded-brutal border-2 py-4 shadow-brutal-1"
              style={{
                borderColor: border,
                backgroundColor: destructive ? bad : primary,
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? (
                <ActivityIndicator size="small" color={destructive ? badInk : primaryInk} />
              ) : (
                <Text className="text-base font-extrabold" style={{ color: destructive ? badInk : primaryInk }}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
