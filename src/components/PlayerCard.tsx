import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, TouchableOpacity, View } from 'react-native';
import { useT } from '../lib/i18n';
import { formatSignedScore } from '../lib/score';

const MEDALS = ['#a0740c', '#787f8c', '#b0713f'];

interface Props {
  rank: number;
  name: string;
  total: number;
  delta?: number | null;
  roundNumber?: number;
  onPress?: () => void;
}

export default function PlayerCard({ rank, name, total, delta, roundNumber, onPress }: Props) {
  const t = useT();
  const isMedal = rank >= 1 && rank <= 3;
  const totalColor =
    total > 0
      ? 'text-good dark:text-good-dark'
      : total < 0
        ? 'text-bad dark:text-bad-dark'
        : 'text-ink-muted dark:text-ink-dark-muted';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      className="flex-row items-center rounded-2xl border border-rule bg-surface-alt px-4 py-4 shadow-soft active:opacity-80 dark:border-rule-dark dark:bg-surface-dark-alt dark:shadow-none"
    >
      <View className="mr-3 w-9 items-center">
        {isMedal ? (
          <Ionicons name="medal" size={26} color={MEDALS[rank - 1]} />
        ) : (
          <View className="h-8 w-8 items-center justify-center rounded-full bg-ink/5 dark:bg-ink-dark/10">
            <Text className="text-sm font-bold tabular-nums text-ink-muted dark:text-ink-dark-muted">{rank}</Text>
          </View>
        )}
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-base font-bold text-ink dark:text-ink-dark" numberOfLines={1}>
          {name}
        </Text>
        {delta != null && roundNumber != null && (
          <Text className="mt-0.5 text-xs text-ink-muted dark:text-ink-dark-muted">
            {t('session.roundLabel', { n: roundNumber })}: {formatSignedScore(delta)}
          </Text>
        )}
      </View>

      <Text className={`text-xl font-extrabold tabular-nums ${totalColor}`}>{formatSignedScore(total)}</Text>
    </TouchableOpacity>
  );
}
