import { FieldProps, Form, Input } from '@oyster/ui';

export const OneTimeCodeForm = () => {};

OneTimeCodeForm.CodeField = function CodeField({
  description = 'Please input the 6-digit passcode that you received.',
  error,
  name,
}: FieldProps<string> & { description?: string }) {
  return (
    <Form.Field
      description={description}
      error={error}
      labelFor={name}
      required
    >
      <Input autoFocus id={name} name={name} required />
    </Form.Field>
  );
};

OneTimeCodeForm.EmailField = function EmailField({
  error,
  name,
}: FieldProps<string>) {
  return (
    <Form.Field
      description="Please input your email in order to receive a one-time passcode."
      error={error}
      labelFor={name}
      required
    >
      <Input autoFocus id={name} name={name} required />
    </Form.Field>
  );
};
