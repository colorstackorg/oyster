import { useState } from 'react';

import { Major } from '@oyster/types';
import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopover,
  type ComboboxProps,
  type FieldProps,
  Form,
  Input,
  type InputProps,
} from '@oyster/ui';
import { toEscapedString, toTitleCase } from '@oyster/utils';

import { School } from '@/modules/education/education.types';

// School Form

const schoolKeys = School.keyof().enum;

export function SchoolCityField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field
      error={error}
      label="City"
      labelFor={schoolKeys.addressCity}
      required
    >
      <Input
        defaultValue={defaultValue}
        id={schoolKeys.addressCity}
        name={schoolKeys.addressCity}
        placeholder="Los Angeles"
        required
      />
    </Form.Field>
  );
}

export function SchoolNameField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field error={error} label="Name" labelFor={schoolKeys.name} required>
      <Input
        defaultValue={defaultValue}
        id={schoolKeys.name}
        name={schoolKeys.name}
        placeholder="University of California, Los Angeles"
        required
      />
    </Form.Field>
  );
}

export function SchoolStateField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field
      description="Please use the two-letter abbreviation."
      error={error}
      label="State"
      labelFor={schoolKeys.addressState}
      required
    >
      <Input
        defaultValue={defaultValue}
        id={schoolKeys.addressState}
        name={schoolKeys.addressState}
        placeholder="CA"
        required
      />
    </Form.Field>
  );
}

export function SchoolZipField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field
      error={error}
      label="Zip Code"
      labelFor={schoolKeys.addressZip}
      required
    >
      <Input
        defaultValue={defaultValue}
        id={schoolKeys.addressZip}
        name={schoolKeys.addressZip}
        placeholder="90210"
        required
      />
    </Form.Field>
  );
}

// Major Combobox

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
