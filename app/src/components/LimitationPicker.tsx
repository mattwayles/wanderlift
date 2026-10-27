/**
 * Track 37a — the plain-language limitation list (body areas, then conditions), one checkbox row
 * per `LIMITATION_CHOICES` entry. Shared by the Limitations screen (Settings) and onboarding; the
 * caller owns persistence and passes the current selection in.
 */
import React from 'react';
import { LIMITATION_CHOICES } from '@roamfit/data';
import { CheckRow, Group } from './SettingsList';

export interface LimitationPickerProps {
  selected: readonly string[];
  onChange: (next: string[]) => void;
}

export function LimitationPicker({ selected, onChange }: LimitationPickerProps): React.JSX.Element {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  const rows = (kind: 'area' | 'condition') =>
    LIMITATION_CHOICES.filter((c) => c.kind === kind).map((choice) => (
      <CheckRow
        key={choice.id}
        testID={`limitation-${choice.id}`}
        label={choice.label}
        description={choice.description}
        checked={selected.includes(choice.id)}
        onPress={() => toggle(choice.id)}
      />
    ));
  return (
    <>
      <Group title="Body areas to protect">{rows('area')}</Group>
      <Group title="Conditions">{rows('condition')}</Group>
    </>
  );
}

/** "Knee, Wrist" — a short summary of a selection for a Settings row; "None" when empty. */
export function limitationSummary(selected: readonly string[]): string {
  const labels = LIMITATION_CHOICES.filter((c) => selected.includes(c.id)).map(
    (c) => c.label.split(':')[0],
  );
  return labels.length === 0 ? 'None' : [...new Set(labels)].join(', ');
}
