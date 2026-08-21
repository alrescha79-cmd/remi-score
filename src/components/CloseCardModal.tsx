import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useT } from '@/lib/i18n';
import { useThemeColor } from '@/lib/theme';
import type { ClosedCardType } from '@/db/models';

export interface CloseCardOption {
  type: ClosedCardType;
  labelKey: string;
  points: number;
  emoji: string;
}

export const CLOSE_CARD_OPTIONS: CloseCardOption[] = [
  { type: 'number', labelKey: 'round.card.number', points: 50, emoji: '🃖' },
  { type: 'letter', labelKey: 'round.card.letter', points: 100, emoji: '🂭' },
  { type: 'ace', labelKey: 'round.card.ace', points: 150, emoji: '🃁' },
  { type: 'joker', labelKey: 'round.card.joker', points: 250, emoji: '🃏' },
];

export const CARD_POINTS: Record<ClosedCardType, number> = {
  number: 50,
  letter: 100,
  ace: 150,
  joker: 250,
};

interface Props {
  visible: boolean;
  playerName: string;
  currentType?: ClosedCardType | null;
  onSelect: (type: ClosedCardType, points: number) => void;
  onRemove: () => void;
  onClose: () => void;
}

export default function CloseCardModal({
  visible,
  playerName,
  currentType,
  onSelect,
  onRemove,
  onClose,
}: Props) {
  const t = useT();
  const surface = useThemeColor('surface');
  const surfaceElevated = useThemeColor('surfaceElevated');
  const ink = useThemeColor('ink');
  const inkMuted = useThemeColor('inkMuted');
  const border = useThemeColor('border');
  const primary = useThemeColor('primary');
  const primaryInk = useThemeColor('primaryInk');
  const good = useThemeColor('good');
  const bad = useThemeColor('bad');

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/60 px-6" onPress={onClose}>
        <Pressable
          className="w-full max-w-sm rounded-brutal-xl border-2 p-5 shadow-brutal-2"
          style={{ borderColor: border, backgroundColor: surface }}
          onPress={() => {}}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="h-10 w-10 items-center justify-center rounded-brutal border-2"
                style={{ borderColor: border, backgroundColor: surfaceElevated }}
              >
                <Text className="text-xl">🎴</Text>
              </View>
              <View>
                <Text className="text-base font-extrabold" style={{ color: ink }}>
                  {t('round.closeCardTitle')}
                </Text>
                <Text className="text-xs font-bold" style={{ color: primary }}>
                  {playerName}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              className="h-8 w-8 items-center justify-center rounded-brutal border-2"
              style={{ borderColor: border, backgroundColor: surfaceElevated }}
            >
              <Ionicons name="close" size={16} color={ink} />
            </TouchableOpacity>
          </View>

          <Text className="mb-3 text-xs font-bold" style={{ color: inkMuted }}>
            {t('round.closeCardSubtitle')}
          </Text>

          <View className="gap-2">
            {CLOSE_CARD_OPTIONS.map((opt) => {
              const isSelected = currentType === opt.type;
              return (
                <TouchableOpacity
                  key={opt.type}
                  onPress={() => {
                    onSelect(opt.type, opt.points);
                    onClose();
                  }}
                  accessibilityRole="button"
                  className="flex-row items-center justify-between rounded-brutal border-2 p-3 active:opacity-80"
                  style={{
                    borderColor: isSelected ? primary : border,
                    backgroundColor: isSelected ? primary : surfaceElevated,
                  }}
                >
                  <View className="flex-row items-center gap-2.5">
                    <View
                      className="h-8 w-8 items-center justify-center rounded-md border"
                      style={{
                        backgroundColor: '#ffffff',
                        borderColor: isSelected ? primaryInk : border,
                      }}
                    >
                      <Text className="text-xl text-black">{opt.emoji}</Text>
                    </View>
                    <Text
                      className="text-sm font-extrabold"
                      style={{ color: isSelected ? primaryInk : ink }}
                    >
                      {t(opt.labelKey)}
                    </Text>
                  </View>

                  <View
                    className="rounded-brutal border px-2 py-0.5"
                    style={{
                      borderColor: isSelected ? primaryInk : border,
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(34,197,94,0.1)',
                    }}
                  >
                    <Text
                      className="text-xs font-extrabold"
                      style={{ color: isSelected ? primaryInk : good }}
                    >
                      +{opt.points}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {currentType != null && (
            <TouchableOpacity
              onPress={() => {
                onRemove();
                onClose();
              }}
              accessibilityRole="button"
              className="mt-3 items-center justify-center rounded-brutal border-2 py-2.5"
              style={{ borderColor: bad, backgroundColor: 'rgba(239,68,68,0.1)' }}
            >
              <Text className="text-xs font-extrabold" style={{ color: bad }}>
                {t('round.cancelClose')}
              </Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
