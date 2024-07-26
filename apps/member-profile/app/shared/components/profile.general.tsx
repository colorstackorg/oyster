import { useState } from 'react';

import { CityCombobox, type CityComboboxProps } from '@oyster/core/location.ui';
import { type FieldProps, Form, Input, Text } from '@oyster/ui';

export function CurrentLocationField({
  defaultValue,
  defaultLatitude,
  defaultLongitude,
  error,
  latitudeName,
  longitudeName,
  name,
}: FieldProps<string> & Omit<CityComboboxProps, 'required'>) {
  return (
    <Form.Field
      description="We'll use this to connect you to ColorStack members and events in your area."
      error={error}
      labelFor={name}
      label="Current Location"
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
    </Form.Field>
  );
}

export function PreferredNameField({
  defaultValue,
  error,
  firstName,
  lastName,
  name,
}: FieldProps<string> & {
  firstName: string;
  lastName: string;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Form.Field error={error} label="Preferred Name" labelFor={name}>
      <Input
        defaultValue={defaultValue}
        id={name}
        name={name}
        onChange={(e) => setValue(e.currentTarget.value)}
      />

      {value && (
        <Text className="mt-2" color="gray-500">
          Your full name will appear as "{firstName} ({value}) {lastName}".
        </Text>
      )}
    </Form.Field>
  );
}
