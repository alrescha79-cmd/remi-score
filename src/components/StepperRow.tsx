import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SCORE_MAX, SCORE_MIN, SCORE_STEP, validateScore } from '../lib/score';
import { useThemeColor } from '@/lib/theme';

interface Props {
  value: number;
  onChange: (value: number) => void;
}

function clamp(v: number): number {
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, v));
}

export default function StepperRow({ value, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const ink = useThemeColor('ink');
  const border = useThemeColor('border');
  const surface = useThemeColor('surface');
  const good = useThemeColor('good');
  const bad = useThemeColor('bad');
  const inkFaint = useThemeColor('inkFaint');

  const valid = validateScore(value);

  const apply = (v: number) => {
    onChange(v);
    if (editing) setDraft(String(v));
  };

  const commitDraft = () => {
    if (editing) {
      if (draft !== '' && draft !== '-') {
        const n = Number(draft);
        if (Number.isInteger(n)) apply(clamp(n));
      }
      setEditing(false);
      setDraft('');
    }
  };

  return (
    <View className="flex-row items-center justify-between gap-1 pt-1">
      <TouchableOpacity
        onPress={() => apply(clamp(value - 25))}
        accessibilityRole="button"
        accessibilityLabel="Kurang 25"
        className="h-11 flex-1 items-center justify-center rounded-brutal border-2"
        style={{ borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.1)' }}
      >
        <Text className="text-sm font-extrabold" style={{ color: bad }}>-25</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => apply(clamp(value - 5))}
        accessibilityRole="button"
        accessibilityLabel="Kurang 5"
        className="h-11 flex-1 items-center justify-center rounded-brutal border-2"
        style={{ borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.1)' }}
      >
        <Text className="text-sm font-extrabold" style={{ color: bad }}>-5</Text>
      </TouchableOpacity>

      <View className="mx-0.5 h-11 w-16 items-center justify-center">
        <TextInput
          className="h-11 w-full rounded-brutal p-0 text-center text-base font-extrabold tabular-nums"
          style={valid
            ? { borderWidth: 2, borderColor: border, backgroundColor: surface, color: ink }
            : { borderWidth: 2, borderColor: bad, backgroundColor: 'rgba(239,68,68,0.15)', color: bad }
          }
          value={editing ? draft : String(value)}
          keyboardType="numbers-and-punctuation"
          placeholder="0"
          placeholderTextColor={valid ? inkFaint : bad}
          onChangeText={setDraft}
          returnKeyType="done"
          onFocus={() => {
            setEditing(true);
            setDraft(String(value));
          }}
          onBlur={commitDraft}
          onSubmitEditing={commitDraft}
        />
      </View>

      <TouchableOpacity
        onPress={() => apply(clamp(value + 5))}
        accessibilityRole="button"
        accessibilityLabel="Tambah 5"
        className="h-11 flex-1 items-center justify-center rounded-brutal border-2"
        style={{ borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.1)' }}
      >
        <Text className="text-sm font-extrabold" style={{ color: good }}>+5</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => apply(clamp(value + 25))}
        accessibilityRole="button"
        accessibilityLabel="Tambah 25"
        className="h-11 flex-1 items-center justify-center rounded-brutal border-2"
        style={{ borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.1)' }}
      >
        <Text className="text-sm font-extrabold" style={{ color: good }}>+25</Text>
      </TouchableOpacity>
    </View>
  );
}

export const STEP = SCORE_STEP;
