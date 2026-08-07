import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SCORE_MAX, SCORE_MIN, SCORE_STEP, formatSignedScore, validateScore } from '../lib/score';

interface Props {
  name: string;
  value: number;
  onChange: (value: number) => void;
  projectedTotal: number;
}

function clamp(v: number): number {
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, v));
}

export default function StepperRow({ name, value, onChange, projectedTotal }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const valid = validateScore(value);
  const totalColor =
    projectedTotal > 0 ? 'text-good' : projectedTotal < 0 ? 'text-bad' : 'text-ink-muted dark:text-ink-dark-muted';

  const apply = (v: number) => {
    onChange(v);
    if (editing) setDraft(String(v));
  };

  const commitDraft = () => {
    if (editing) {
      if (draft !== '') {
        const n = Number(draft);
        if (Number.isInteger(n)) apply(clamp(n));
      }
      setEditing(false);
      setDraft('');
    }
  };

  return (
    <View className="flex-row items-center rounded-2xl bg-surface-alt px-3 py-3 dark:bg-surface-dark-alt">
      <View className="flex-1">
        <Text className="text-sm font-semibold text-ink dark:text-ink-dark">{name}</Text>
        <Text className={`text-xs tabular-nums ${totalColor}`}>= {formatSignedScore(projectedTotal)}</Text>
      </View>

      <StepperButton label="−25" onPress={() => apply(clamp(value - 25))} />
      <StepperButton label="−5" onPress={() => apply(clamp(value - 5))} />

      <TextInput
        className={`mx-1 h-12 w-20 rounded-xl border text-center text-lg font-bold tabular-nums ${
          valid
            ? 'border-ink/15 bg-white text-ink dark:border-ink-dark/15 dark:bg-surface-dark dark:text-ink-dark'
            : 'border-bad bg-bad/10 text-bad'
        }`}
        value={editing ? draft : String(value)}
        keyboardType="numbers-and-punctuation"
        placeholder="0"
        placeholderTextColor="#9aa3af"
        onChangeText={setDraft}
        onFocus={() => {
          setEditing(true);
          setDraft(String(value));
        }}
        onBlur={commitDraft}
        onSubmitEditing={commitDraft}
      />

      <StepperButton label="+5" onPress={() => apply(clamp(value + 5))} />
      <StepperButton label="+25" onPress={() => apply(clamp(value + 25))} />
    </View>
  );
}

function StepperButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="ml-1 h-11 min-w-[52px] items-center justify-center rounded-xl bg-accent-soft px-2 dark:bg-accent-dark-soft"
    >
      <Text className="text-base font-bold text-accent dark:text-white">{label}</Text>
    </TouchableOpacity>
  );
}

export const STEP = SCORE_STEP;
