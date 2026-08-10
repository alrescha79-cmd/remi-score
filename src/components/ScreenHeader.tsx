import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  backLabel?: string;
  compact?: boolean;
}

export default function ScreenHeader({ title, subtitle, onBack, right, backLabel, compact }: ScreenHeaderProps) {
  return (
    <View className={`flex-row items-center px-4 ${compact ? 'pb-2 pt-2.5' : 'pb-3 pt-4'}`}>
      {onBack != null && (
        <TouchableOpacity
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={backLabel ?? 'Back'}
          className={`mr-3 items-center justify-center rounded-full border border-rule bg-surface-alt dark:border-white/15 dark:bg-surface-dark-fill ${
            compact ? 'h-9 w-9' : 'h-11 w-11'
          }`}
        >
          <Ionicons name="chevron-back" size={compact ? 18 : 20} className="text-ink dark:text-ink-dark" />
        </TouchableOpacity>
      )}
      <View className="min-w-0 flex-1">
        <Text
          className={`font-extrabold tracking-tight text-ink dark:text-ink-dark ${
            compact ? 'text-lg' : 'text-xl'
          }`}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle != null && !compact && (
          <Text className="mt-0.5 text-xs text-ink-muted dark:text-ink-dark-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}
