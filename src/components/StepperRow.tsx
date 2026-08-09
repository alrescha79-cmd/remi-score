import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SCORE_MAX, SCORE_MIN, SCORE_STEP, validateScore } from '../lib/score';

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
      {/* Minus Buttons (Red) */}
      <TouchableOpacity
        onPress={() => apply(clamp(value - 25))}
        accessibilityRole="button"
        accessibilityLabel="Kurang 25"
        className="h-11 flex-1 items-center justify-center rounded-lg border border-bad/25 bg-bad/10 active:bg-bad/20 dark:border-bad-dark/30 dark:bg-bad-dark/15 dark:active:bg-bad-dark/30"
      >
        <Text className="text-sm font-extrabold text-bad dark:text-bad-dark">−25</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => apply(clamp(value - 5))}
        accessibilityRole="button"
        accessibilityLabel="Kurang 5"
        className="h-11 flex-1 items-center justify-center rounded-lg border border-bad/25 bg-bad/10 active:bg-bad/20 dark:border-bad-dark/30 dark:bg-bad-dark/15 dark:active:bg-bad-dark/30"
      >
        <Text className="text-sm font-extrabold text-bad dark:text-bad-dark">−5</Text>
      </TouchableOpacity>

      {/* Score Input */}
      <View className="mx-0.5 h-11 w-16 items-center justify-center">
        <TextInput
          className={`h-11 w-full rounded-lg p-0 text-center text-base font-extrabold tabular-nums ${
            valid
              ? 'border border-rule bg-surface-fill text-ink placeholder:text-ink-faint dark:border-rule-dark dark:bg-surface-dark-fill dark:text-ink-dark dark:placeholder:text-ink-dark-faint'
              : 'border-2 border-bad bg-bad/15 text-bad dark:border-bad-dark dark:bg-bad-dark/20 dark:text-bad-dark'
          }`}
          value={editing ? draft : String(value)}
          keyboardType="numbers-and-punctuation"
          placeholder="0"
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

      {/* Plus Buttons (Green) */}
      <TouchableOpacity
        onPress={() => apply(clamp(value + 5))}
        accessibilityRole="button"
        accessibilityLabel="Tambah 5"
        className="h-11 flex-1 items-center justify-center rounded-lg border border-good/25 bg-good/10 active:bg-good/20 dark:border-good-dark/30 dark:bg-good-dark/15 dark:active:bg-good-dark/30"
      >
        <Text className="text-sm font-extrabold text-good dark:text-good-dark">+5</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => apply(clamp(value + 25))}
        accessibilityRole="button"
        accessibilityLabel="Tambah 25"
        className="h-11 flex-1 items-center justify-center rounded-lg border border-good/25 bg-good/10 active:bg-good/20 dark:border-good-dark/30 dark:bg-good-dark/15 dark:active:bg-good-dark/30"
      >
        <Text className="text-sm font-extrabold text-good dark:text-good-dark">+25</Text>
      </TouchableOpacity>
    </View>
  );
}

export const STEP = SCORE_STEP;
