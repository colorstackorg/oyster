import { type Country } from '@oyster/core/location/types';
import { CityCombobox, type CityComboboxProps } from '@oyster/core/location/ui';
import { FORMATTED_GENDER, type Gender } from '@oyster/types';
import {
  Checkbox,
  DatePicker,
  Field,
  type FieldProps,
  Select,
} from '@oyster/ui';

import { EthnicityMultiCombobox } from '@/shared/components/ethnicity-combobox';

export function BirthdateNotificationField({
  defaultValue,
  error,
  name,
}: FieldProps<boolean>) {
  return (
    <Field error={error}>
      <Checkbox
        color="gold-100"
        defaultChecked={defaultValue}
        label="Wish me a happy birthday in the Family Slack! 🎈"
        name={name}
        value="1"
      />
    </Field>
  );
}

export function BirthdateField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Field
      description="We'll wish you a happy birthday in the #birthdays Slack channel!"
      error={error}
      label="Birthdate"
      labelFor={name}
    >
      <DatePicker
        defaultValue={defaultValue}
        id={name}
        name={name}
        type="date"
      />
    </Field>
  );
}

export function EthnicityField({
  defaultValue = [],
  error,
  name,
}: FieldProps<Pick<Country, 'code' | 'demonym' | 'flagEmoji'>[]>) {
  return (
    <Field error={error} labelFor={name} label="Ethnicity">
      <EthnicityMultiCombobox
        defaultValues={defaultValue.map((ethnicity) => {
          return {
            label: `${ethnicity.flagEmoji} ${ethnicity.demonym}`,
            value: ethnicity.code!,
          };
        })}
        name={name}
      />
    </Field>
  );
}

const GENDERS_IN_ORDER: Gender[] = [
  'cisgender_man',
  'cisgender_woman',
  'transgender_man',
  'transgender_woman',
  'non_binary',
  'prefer_not_to_say',
];

export function GenderField({ defaultValue, error, name }: FieldProps<string>) {
  return (
    <Field error={error} label="Gender" labelFor={name} required>
      <Select defaultValue={defaultValue} id={name} name={name} required>
        {GENDERS_IN_ORDER.map((value) => {
          return (
            <option key={value} value={value}>
              {FORMATTED_GENDER[value]}
            </option>
          );
        })}
      </Select>
    </Field>
  );
}

export function HometownField({
  defaultValue,
  defaultLatitude,
  defaultLongitude,
  description,
  error,
  latitudeName,
  longitudeName,
  name,
}: FieldProps<string> &
  Omit<CityComboboxProps, 'required'> & { description?: string }) {
  return (
    <Field
      description={description}
      error={error}
      labelFor={name}
      label="Hometown"
      required
    >
      <CityCombobox
        defaultLatitude={defaultLatitude}
        defaultLongitude={defaultLongitude}
        defaultValue={defaultValue}
        name={name}
        latitudeName={latitudeName}
        longitudeName={longitudeName}
        required
      />
    </Field>
  );
}
