import { Form as RemixForm } from '@remix-run/react';

import { AddInterviewReviewInput } from '@oyster/core/employment';
import { Form } from '@oyster/ui';
import { Button, Divider, type FieldProps, Textarea } from '@oyster/ui';

import { CompanyCombobox, CompanyFieldProvider } from '@/member-profile.ui';

const keys = AddInterviewReviewInput.keyof().enum;

type AddInterviewReviewFormProps = {
  error?: string;
  errors: Partial<Record<keyof AddInterviewReviewInput, string>>;
};

export function AddInterviewReviewForm({
  error,
  errors,
}: AddInterviewReviewFormProps) {
  return (
    <RemixForm className="form" method="post">
      <CompanyField
        error={errors.companyCrunchbaseId}
        name={keys.companyCrunchbaseId}
      />

      <PositionField
        error={errors.interviewPosition}
        name={keys.interviewPosition}
      />

      <InterviewTextField error={errors.text} name={keys.text} />

      <Divider />

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Save</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}

function CompanyField({ defaultValue, error, name }: FieldProps<string>) {
  return (
    <Form.Field error={error} label="Company" labelFor={name} required>
      <CompanyFieldProvider allowFreeText={false}>
        <CompanyCombobox defaultCrunchbaseId={defaultValue} name={name} />
      </CompanyFieldProvider>
    </Form.Field>
  );
}

function InterviewTextField({ defaultValue, error, name }: FieldProps<string>) {
  return (
    <Form.Field
      description={
        <div>
          Feel free to use these guiding questions:
          <ul className="mt-2 list-disc ps-8">
            <li>How many rounds was the interview process?</li>
            <li>What did each round look like?</li>
            <li>What types of questions were asked?</li>
            <li>What resources did you use to prepare?</li>
          </ul>
        </div>
      }
      error={error}
      label="Write a review about your interview experience with this company."
      labelFor={name}
      required
    >
      <Textarea
        defaultValue={defaultValue}
        id={name}
        minLength={0}
        minRows={10}
        name={name}
        required
      />
    </Form.Field>
  );
}

function PositionField({ defaultValue, error, name }: FieldProps<string>) {
  return (
    <Form.Field
      error={error}
      label="What position or program did you apply for?"
      labelFor={name}
      required
    >
      <Textarea
        defaultValue={defaultValue}
        id={name}
        maxLength={100}
        minRows={1}
        name={name}
        required
      />
    </Form.Field>
  );
}
