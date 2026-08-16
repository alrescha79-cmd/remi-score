import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, TouchableOpacity, View } from 'react-native';
import { useT } from '../lib/i18n';
import { formatSignedScore } from '../lib/score';
import { useThemeColor } from '@/lib/theme';

const MEDALS = ['#a0740c', '#787f8c', '#b0713f'];

interface Props {
  rank: number;
  name: string;
  total: number;
  delta?: number | null;
  roundNumber?: number;
  afk?: boolean;
  onPress?: () => void;
}

export default function PlayerCard({ rank, name, total, delta, roundNumber, afk, onPress }: Props) {
  const t = useT();
  const isMedal = rank >= 1 && rank <= 3;

  const ink = useThemeColor('ink');
  const inkMuted = useThemeColor('inkMuted');
  const border = useThemeColor('border');
  const surface = useThemeColor('surface');
  const surfaceElevated = useThemeColor('surfaceElevated');
  const good = useThemeColor('good');
  const bad = useThemeColor('bad');

  const totalColor = total > 0 ? good : total < 0 ? bad : inkMuted;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      className="flex-row items-center rounded-brutal-lg border-2 px-4 py-4 shadow-brutal-1 active:opacity-80"
      style={{ borderColor: border, backgroundColor: surface }}
    >
      <View className="mr-3 w-9 items-center">
        {isMedal ? (
          <Ionicons name="medal" size={26} color={MEDALS[rank - 1]} />
        ) : (
          <View className="h-8 w-8 items-center justify-center rounded-full border" style={{ borderColor: border, backgroundColor: surfaceElevated }}>
            <Text className="text-sm font-bold tabular-nums" style={{ color: inkMuted }}>{rank}</Text>
          </View>
        )}
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-base font-bold" style={{ color: afk ? inkMuted : ink }} numberOfLines={1}>
            {name}
          </Text>
          {afk && (
            <View className="rounded border px-1.5 py-0.5" style={{ borderColor: bad }}>
              <Text className="text-[9px] font-extrabold uppercase" style={{ color: bad }}>{t('round.absentShort')}</Text>
            </View>
          )}
        </View>
        {roundNumber != null && roundNumber > 0 && (
          <Text className="mt-0.5 text-xs" style={{ color: inkMuted }}>
            {t('session.roundLabel', { n: roundNumber })}: {delta === null || afk ? t('round.absentShort') : formatSignedScore(delta)}
          </Text>
        )}
      </View>

      <Text className="text-xl font-extrabold tabular-nums" style={{ color: totalColor }}>{formatSignedScore(total)}</Text>
    </TouchableOpacity>
  );
}
