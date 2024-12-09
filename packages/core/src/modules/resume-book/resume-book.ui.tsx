import { DatePicker, type FieldProps, Form, Input, Radio } from '@oyster/ui';

import { ResumeBook } from '@/modules/resume-book/resume-book.types';

const keys = ResumeBook.keyof().enum;

export function ResumeBookEndDateField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <FormField
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
    </FormField>
  );
}

export function ResumeBookHiddenField({
  defaultValue,
  error,
}: Omit<FieldProps<boolean>, 'name'>) {
  return (
    <FormField
      description='If you choose "Hidden", the resume book will only be accessible to members who have the link. If you choose "Visible", the resume book will be accessible in the Member Profile navigation to all members.'
      error={error}
      label="Visibility"
      labelFor={keys.hidden}
      required
    >
      <Radio.Group>
        <Radio
          color="amber-100"
          defaultChecked={defaultValue === true}
          id={keys.hidden + '_1'}
          label="Hidden"
          name={keys.hidden}
          required
          value="1"
        />
        <Radio
          color="orange-100"
          defaultChecked={defaultValue === false}
          id={keys.hidden + '_0'}
          label="Visible"
          name={keys.hidden}
          required
          value="0"
        />
      </Radio.Group>
    </FormField>
  );
}

export function ResumeBookNameField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <FormField
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
    </FormField>
  );
}

export function ResumeBookStartDateField({
  defaultValue,
  error,
}: Omit<FieldProps<string>, 'name'>) {
  return (
    <FormField
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
    </FormField>
  );
}
