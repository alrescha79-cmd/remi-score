import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeColor } from '@/lib/theme';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
}

export default function EmptyState({ icon = 'apps-outline', message }: Props) {
  const border = useThemeColor('border');
  const surfaceElevated = useThemeColor('surfaceElevated');
  const inkMuted = useThemeColor('inkMuted');
  const primary = useThemeColor('primary');

  return (
    <View className="items-center justify-center px-6 py-12">
      <View className="h-16 w-16 items-center justify-center rounded-brutal-lg border-2" style={{ borderColor: border, backgroundColor: surfaceElevated }}>
        <Ionicons name={icon} size={28} color={primary} />
      </View>
      <Text className="mt-4 max-w-[280px] text-center text-sm font-medium" style={{ color: inkMuted }}>{message}</Text>
    </View>
  );
}
