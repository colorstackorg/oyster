import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';

import { Major } from '@oyster/types';
import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopover,
  type ComboboxProps,
  Field,
  type FieldProps,
  Input,
  type InputProps,
  Select,
  Text,
  useDelayedValue,
} from '@oyster/ui';
import { toEscapedString, toTitleCase } from '@oyster/utils';

import { School, SchoolTag } from '@/modules/education/education.types';

// School Form

const schoolKeys = School.keyof().enum;

export function SchoolCityField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field
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
    </Field>
  );
}

export function SchoolNameField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field error={error} label="Name" labelFor={schoolKeys.name} required>
      <Input
        defaultValue={defaultValue}
        id={schoolKeys.name}
        name={schoolKeys.name}
        placeholder="University of California, Los Angeles"
        required
      />
    </Field>
  );
}

export function SchoolStateField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field
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
    </Field>
  );
}

const SCHOOL_TAG_OPTIONS = [
  { label: 'HBCU', value: SchoolTag.HBCU },
  { label: 'HSI', value: SchoolTag.HSI },
];

export function SchoolTagsField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field
      description="Is this school an HBCU or HSI?"
      error={error}
      label="Tag(s)"
      labelFor={schoolKeys.tags}
    >
      <Select
        defaultValue={defaultValue}
        id={schoolKeys.tags}
        name={schoolKeys.tags}
      >
        {SCHOOL_TAG_OPTIONS.map(({ label, value }) => {
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </Select>
    </Field>
  );
}

export function SchoolZipField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Field error={error} label="Zip Code" labelFor={schoolKeys.addressZip}>
      <Input
        defaultValue={defaultValue}
        id={schoolKeys.addressZip}
        name={schoolKeys.addressZip}
        placeholder="90210"
      />
    </Field>
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

// School Combobox

type SchoolComboboxProps = Pick<InputProps, 'readOnly' | 'required'> & {
  defaultValue?: Pick<School, 'id' | 'name'>;
  name: string;
  onSelect?: React.HTMLProps<HTMLButtonElement>['onClick'];
  popoverProps?: Partial<React.ComponentProps<typeof ComboboxPopover>>;
};

export function SchoolCombobox({
  defaultValue = { id: '', name: '' },
  name,
  onSelect,
  popoverProps = {},
  readOnly,
  required,
}: SchoolComboboxProps) {
  const [search, setSearch] = useState<string>('');

  const delayedSearch = useDelayedValue(search, 250);

  const fetcher = useFetcher<{
    schools: Pick<School, 'id' | 'logoUrl' | 'name'>[];
  }>();

  useEffect(() => {
    fetcher.submit(
      { search: delayedSearch },
      {
        action: '/schools',
        method: 'get',
      }
    );
  }, [delayedSearch]);

  const schools = fetcher.data?.schools || [];

  return (
    <Combobox
      defaultDisplayValue={defaultValue.name}
      defaultValue={defaultValue.id}
    >
      <ComboboxInput
        id={name}
        name={name}
        onChange={(e) => setSearch(e.currentTarget.value)}
        readOnly={readOnly}
        required={required}
      />

      <ComboboxPopover {...popoverProps}>
        <ul>
          {schools.map((school) => {
            return (
              <ComboboxItem
                displayValue={school.name}
                key={school.id}
                onSelect={onSelect}
                value={school.id}
              >
                <span className="flex items-center gap-2">
                  {school.logoUrl ? (
                    <img
                      alt={school.name}
                      className="h-6 w-6 rounded"
                      src={school.logoUrl}
                    />
                  ) : (
                    <div className="h-6 w-6 rounded bg-gray-100" />
                  )}{' '}
                  <Text as="span" variant="sm">
                    {school.name}
                  </Text>
                </span>
              </ComboboxItem>
            );
          })}

          <ComboboxItem onSelect={onSelect} value="other">
            Other
          </ComboboxItem>
        </ul>
      </ComboboxPopover>
    </Combobox>
  );
}
