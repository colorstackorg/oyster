import { Checkbox, DatePicker, type FieldProps, Form, Input } from '@oyster/ui';

import { ResumeBook } from '@/modules/resume-book/resume-book.types';

const keys = ResumeBook.keyof().enum;

export function ResumeBookEndDateField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field
      description="The date that the resume book should stop accepting responses."
      error={error}
      label="End Date"
      labelFor={keys.endDate}
      required
    >
      <DatePicker
        defaultValue={defaultValue}
        id={keys.endDate}
        name={keys.endDate}
        type="date"
        required
      />
    </Form.Field>
  );
}

export function ResumeBookHiddenField({
  defaultValue,
  error,
}: Omit<FieldProps<boolean>, 'name'>) {
  return (
    <Form.Field
      description="If you check this box, the resume book will not be visible in the Member Profile and will only be accessible to members who have the link."
      error={error}
      label="Hidden"
      labelFor={keys.hidden}
      required
    >
      <Checkbox
        color="red-100"
        defaultChecked={defaultValue}
        label="Yes"
        id={keys.hidden}
        name={keys.hidden}
        value="1"
      />
    </Form.Field>
  );
}

export function ResumeBookNameField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field
      description={`Please don't add "Resume Book" to the title. Example: Spring '24`}
      error={error}
      label="Name"
      labelFor={keys.name}
      required
    >
      <Input
        defaultValue={defaultValue}
        id={keys.name}
        name={keys.name}
        required
      />
    </Form.Field>
  );
}

export function ResumeBookStartDateField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <Form.Field
      description="The date that the resume book should start accepting responses."
      error={error}
      label="Start Date"
      labelFor={keys.startDate}
      required
    >
      <DatePicker
        defaultValue={defaultValue}
        id={keys.startDate}
        name={keys.startDate}
        type="date"
        required
      />
    </Form.Field>
  );
}
