import { useState } from 'react';

import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopover,
  ComboboxProps,
  FieldProps,
  InputProps,
} from '@colorstack/core-ui';
import { Major } from '@colorstack/types';
import { toEscapedString, toTitleCase } from '@colorstack/utils';

const TOP_MAJORS: Major[] = [
  'computer_science',
  'information_science',
  'electrical_or_computer_engineering',
];

const SORTED_MAJORS = [
  ...TOP_MAJORS,
  ...Object.values(Major).filter((major) => {
    return !TOP_MAJORS.includes(major);
  }),
];

/**
 * Returns the list of majors that match the given search string. It will
 * always keep the `other` option available - no need to filter that out.
 *
 * @param search - The search string to filter majors by.
 */
function searchMajors(search: string) {
  return SORTED_MAJORS.filter((major) => {
    return major === 'other'
      ? true
      : new RegExp(toEscapedString(search), 'i').test(toTitleCase(major));
  });
}

type MajorComboboxProps = Omit<FieldProps<Major>, 'error'> &
  Pick<ComboboxProps, 'defaultDisplayValue'> &
  Pick<InputProps, 'readOnly' | 'required'> & {
    onSelect?: React.HTMLProps<HTMLButtonElement>['onClick'];
  };

export function MajorCombobox({
  defaultDisplayValue,
  defaultValue,
  name,
  onSelect,
  readOnly,
  required,
}: MajorComboboxProps) {
  const [search, setSearch] = useState<string>('');

  const majors = searchMajors(search);

  return (
    <Combobox
      defaultDisplayValue={defaultDisplayValue}
      defaultValue={defaultValue}
    >
      <ComboboxInput
        id={name}
        name={name}
        onChange={(e) => setSearch(e.currentTarget.value)}
        readOnly={readOnly}
        required={required}
      />

      <ComboboxPopover>
        <ul>
          {majors.map((major) => {
            return (
              <ComboboxItem key={major} onSelect={onSelect} value={major}>
                {toTitleCase(major)}
              </ComboboxItem>
            );
          })}
        </ul>
      </ComboboxPopover>
    </Combobox>
  );
}
