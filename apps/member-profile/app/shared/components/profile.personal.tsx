import { FORMATTED_GENDER, Gender } from '@oyster/types';
import { Checkbox, DatePicker, FieldProps, Form, Select } from '@oyster/ui';

import { Country } from '../core.ui';
import { CityCombobox, CityComboboxProps } from './city-combobox';
import { EthnicityMultiCombobox } from './ethnicity-combobox';

export function AllowEmailShareField({
  defaultValue,
  error,
  name,
}: FieldProps<boolean>) {
  return (
    <Form.Field error={error}>
      <Checkbox
        defaultChecked={defaultValue}
        label="Share my email with Chapter Leaders! 🌟 "
        name={name}
        value="1"
      />
    </Form.Field>
  );
}

export function BirthdateNotificationField({
  defaultValue,
  error,
  name,
}: FieldProps<boolean>) {
  return (
    <Form.Field error={error}>
      <Checkbox
        color="gold-100"
        defaultChecked={defaultValue}
        label="Wish me a happy birthday in the Family Slack! 🎈"
        name={name}
        value="1"
      />
    </Form.Field>
  );
}

export function BirthdateField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Form.Field
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
    </Form.Field>
  );
}
export function EthnicityField({
  defaultValue = [],
  error,
  name,
}: FieldProps<Pick<Country, 'code' | 'demonym' | 'flagEmoji'>[]>) {
  return (
    <Form.Field error={error} labelFor={name} label="Ethnicity(s)">
      <EthnicityMultiCombobox
        defaultValues={defaultValue.map((ethnicity) => {
          return {
            label: `${ethnicity.flagEmoji} ${ethnicity.demonym}`,
            value: ethnicity.code!,
          };
        })}
        name={name}
      />
    </Form.Field>
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
    <Form.Field error={error} label="Gender" labelFor={name} required>
      <Select defaultValue={defaultValue} id={name} name={name} required>
        {GENDERS_IN_ORDER.map((value) => {
          return (
            <option key={value} value={value}>
              {FORMATTED_GENDER[value]}
            </option>
          );
        })}
      </Select>
    </Form.Field>
  );
}

export function HometownField({
  defaultValue,
  defaultLatitude,
  defaultLongitude,
  error,
  latitudeName,
  longitudeName,
  name,
}: FieldProps<string> & Omit<CityComboboxProps, 'required'>) {
  return (
    <Form.Field error={error} labelFor={name} label="Hometown" required>
      <CityCombobox
        defaultLatitude={defaultLatitude}
        defaultLongitude={defaultLongitude}
        defaultValue={defaultValue}
        name={name}
        latitudeName={latitudeName}
        longitudeName={longitudeName}
        required
      />
    </Form.Field>
  );
}
