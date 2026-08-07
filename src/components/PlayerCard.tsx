import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { useT } from '../lib/i18n';
import { formatSignedScore } from '../lib/score';

const MEDALS = ['#f5a623', '#a6adb8', '#c2703a'];

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
    total > 0 ? 'text-good' : total < 0 ? 'text-bad' : 'text-ink-muted dark:text-ink-dark-muted';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center rounded-2xl bg-surface-alt px-4 py-3 dark:bg-surface-dark-alt ${
        onPress ? 'active:opacity-80' : ''
      }`}
    >
      <View className="mr-3 w-8 items-center">
        {isMedal ? (
          <Ionicons name="medal" size={26} color={MEDALS[rank - 1]} />
        ) : (
          <View className="h-8 w-8 items-center justify-center rounded-full bg-ink/10 dark:bg-ink-dark/10">
            <Text className="text-sm font-bold text-ink-muted dark:text-ink-dark-muted">{rank}</Text>
          </View>
        )}
      </View>

      <View className="flex-1">
        <Text className="text-base font-semibold text-ink dark:text-ink-dark">{name}</Text>
        {delta != null && roundNumber != null && (
          <Text className="text-xs text-ink-muted dark:text-ink-dark-muted">
            {t('session.roundLabel', { n: roundNumber })}: {formatSignedScore(delta)}
          </Text>
        )}
      </View>

      <Text className={`text-xl font-bold tabular-nums ${totalColor}`}>{formatSignedScore(total)}</Text>
    </TouchableOpacity>
  );
}
