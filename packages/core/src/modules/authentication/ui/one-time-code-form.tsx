import { type FieldProps, Form, Input } from '@oyster/ui';

export const OneTimeCodeForm = () => {};

OneTimeCodeForm.CodeField = function CodeField({
  description = 'Please input the 6-digit passcode that you received.',
  error,
  name,
}: FieldProps<string> & { description?: string }) {
  return (
    <FormField description={description} error={error} labelFor={name} required>
      <Input autoFocus id={name} name={name} required />
    </FormField>
  );
};

OneTimeCodeForm.EmailField = function EmailField({
  error,
  name,
}: FieldProps<string>) {
  return (
    <FormField
      description="Please input your email in order to receive a one-time passcode."
      error={error}
      labelFor={name}
      required
    >
      <Input autoFocus id={name} name={name} required />
    </FormField>
  );
};
