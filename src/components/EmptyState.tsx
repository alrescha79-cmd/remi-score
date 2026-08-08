import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
}

export default function EmptyState({ icon = 'apps-outline', message }: Props) {
  return (
    <View className="items-center justify-center rounded-2xl border border-dashed border-ink/15 py-10 dark:border-ink-dark/15">
      <Ionicons name={icon} size={36} color="#9aa3af" />
      <Text className="mt-3 text-center text-sm text-ink-muted dark:text-ink-dark-muted">{message}</Text>
    </View>
  );
}
