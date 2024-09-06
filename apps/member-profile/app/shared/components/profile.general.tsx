import { useState } from 'react';

import { CityCombobox, type CityComboboxProps } from '@oyster/core/location/ui';
import { type FieldProps, Form, Input, InputField, Text } from '@oyster/ui';

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

const formatPhoneNumber = (input: string) => {
  const cleaned = input.replace(/\D/g, '');

  if (cleaned.length == 0) {
    return '';
  } else if (cleaned.length <= 3) {
    return `(${cleaned}`;
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)})-${cleaned.slice(3)}`;
  } else {
    return `(${cleaned.slice(0, 3)})-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }
};

export const PhoneNumberField = ({
  defaultValue,
  error,
  name,
}: FieldProps<string>) => {
  const [phoneNumber, setPhoneNumber] = useState(defaultValue || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);

    setPhoneNumber(formatted);
  };

  return (
    <InputField
      value={phoneNumber}
      onChange={handleChange}
      error={error}
      label="Phone Number"
      name={name}
      description="Enter your 10-digit phone number."
      placeholder="(555)-123-4567"
      type="tel"
    />
  );
};
