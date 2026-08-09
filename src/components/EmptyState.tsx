import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
}

export default function EmptyState({ icon = 'apps-outline', message }: Props) {
  return (
    <View className="items-center justify-center px-6 py-12">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-accent-soft dark:bg-accent-dark-soft">
        <Ionicons name={icon} size={28} className="text-accent dark:text-accent-dark" />
      </View>
      <Text className="mt-4 max-w-[280px] text-center text-sm text-ink-muted dark:text-ink-dark-muted">{message}</Text>
    </View>
  );
}
