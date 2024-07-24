import { type FieldProps, Form, Input } from '@oyster/ui';

import { School } from '@/modules/education/education.types';

const keys = School.keyof().enum;

export function SchoolCityField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field error={error} label="City" labelFor={keys.addressCity} required>
      <Input
        defaultValue={defaultValue}
        id={keys.addressCity}
        name={keys.addressCity}
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
    <Form.Field error={error} label="Name" labelFor={keys.name} required>
      <Input
        defaultValue={defaultValue}
        id={keys.name}
        name={keys.name}
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
      labelFor={keys.addressState}
      required
    >
      <Input
        defaultValue={defaultValue}
        id={keys.addressState}
        name={keys.addressState}
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
      labelFor={keys.addressZip}
      required
    >
      <Input
        defaultValue={defaultValue}
        id={keys.addressZip}
        name={keys.addressZip}
        placeholder="90210"
        required
      />
    </Form.Field>
  );
}
