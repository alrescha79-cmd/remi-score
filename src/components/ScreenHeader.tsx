import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useThemeColor } from '@/lib/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  backLabel?: string;
  compact?: boolean;
}

export default function ScreenHeader({ title, subtitle, onBack, right, backLabel, compact }: ScreenHeaderProps) {
  const bg = useThemeColor('bg');
  const surface = useThemeColor('surface');
  const ink = useThemeColor('ink');
  const inkMuted = useThemeColor('inkMuted');
  const border = useThemeColor('border');

  return (
    <View className={`flex-row items-center px-4 ${compact ? 'pb-2 pt-2.5' : 'pb-3 pt-4'}`}>
      {onBack != null && (
        <TouchableOpacity
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={backLabel ?? 'Back'}
          className={`mr-3 items-center justify-center rounded-brutal border-2 ${
            compact ? 'h-9 w-9' : 'h-11 w-11'
          }`}
          style={{ borderColor: border, backgroundColor: surface }}
        >
          <Ionicons name="chevron-back" size={compact ? 18 : 20} color={ink} />
        </TouchableOpacity>
      )}
      <View className="min-w-0 flex-1">
        <Text
          className={`font-extrabold tracking-tight ${
            compact ? 'text-lg' : 'text-xl'
          }`}
          style={{ color: ink }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle != null && !compact && (
          <Text className="mt-0.5 text-xs" style={{ color: inkMuted }} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}
