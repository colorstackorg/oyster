import { type FieldProps, FileUploader, Form } from '@oyster/ui';

import { ImportRecipientsInput } from '@/modules/scholarship/scholarship.types';

const importKeys = ImportRecipientsInput.keyof().enum;

export function ScholarshipFileField({
  error,
}: Pick<FieldProps<string>, 'error'>) {
  return (
    <Form.Field
      description="Please upload a .csv file."
      error={error}
      label="File"
      labelFor={importKeys.file}
      required
    >
      <FileUploader
        accept={['text/csv']}
        id={importKeys.file}
        name={importKeys.file}
        required
      />
    </Form.Field>
  );
}
