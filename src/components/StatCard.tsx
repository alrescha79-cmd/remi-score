import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { useThemeColor } from '@/lib/theme';

export interface StatCardProps {
  label: string;
  value: string;
  color?: string;
  medal?: string;
}

export default function StatCard({ label, value, color, medal }: StatCardProps) {
  const surface = useThemeColor('surface');
  const ink = useThemeColor('ink');
  const inkMuted = useThemeColor('inkMuted');
  const border = useThemeColor('border');

  return (
    <View
      className="flex-1 items-center rounded-brutal-lg border-2 px-1 py-2.5 shadow-brutal-1"
      style={{ borderColor: border, backgroundColor: surface }}
    >
      <View className="h-7 w-full items-center justify-center px-1">
        <Text
          className="text-[10px] font-bold uppercase tracking-wider text-center"
          numberOfLines={2}
          style={{ color: inkMuted }}
        >
          {label}
        </Text>
      </View>
      <View className="mt-1 h-8 w-full flex-row items-center justify-center">
        {medal && <Ionicons name="medal" size={18} color={medal} style={{ marginRight: 3 }} />}
        <Text
          className="text-xl font-extrabold tabular-nums text-center"
          numberOfLines={1}
          style={{ color: color ?? ink }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
