import { Form as RemixForm } from '@remix-run/react';
import { useFetcher } from '@remix-run/react';
import React, { useContext, useEffect, useState } from 'react';

import {
  AddInterviewReviewInput,
  type BaseCompany,
  type Company,
  type EditInterviewReviewInput,
} from '@oyster/core/employment';
import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopover,
  Form,
  useDelayedValue,
} from '@oyster/ui';
import { Button, Divider, type FieldProps, Textarea } from '@oyster/ui';

type WorkFormState = {
  isCurrentRole: boolean;
  isOtherCompany: boolean;
  setIsCurrentRole(value: boolean): void;
  setIsOtherCompany(value: boolean): void;
};

const WorkFormContext = React.createContext<WorkFormState>({
  isCurrentRole: false,
  isOtherCompany: false,
  setIsCurrentRole: (_: boolean) => {},
  setIsOtherCompany: (_: boolean) => {},
});

const keys = AddInterviewReviewInput.keyof().enum;

// Forms

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
      <CompanyField error={errors.companyId} name="companyCrunchbaseId" />
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

type EditReviewFormProps = Omit<
  AddInterviewReviewFormProps,
  'showExperienceField'
> & {
  review: Pick<EditInterviewReviewInput, 'interviewPosition' | 'text'>;
};

export function EditInterviewReviewForm({
  error,
  errors,
  review,
}: EditReviewFormProps) {
  return (
    <RemixForm className="form" method="post">
      <PositionField
        defaultValue={review.interviewPosition}
        error={errors.interviewPosition}
        name={keys.interviewPosition}
      />

      <InterviewTextField
        defaultValue={review.text}
        error={errors.text}
        name={keys.text}
      />

      <Divider />

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Save</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}

type CompanyFieldProps = FieldProps<Pick<Company, 'crunchbaseId' | 'name'>>;

const CompanyField = ({
  defaultValue = { crunchbaseId: '', name: '' },
  error,
  name,
}: CompanyFieldProps) => {
  const { setIsOtherCompany } = useContext(WorkFormContext);
  const [search, setSearch] = useState<string>(defaultValue.name);
  const delayedSearch = useDelayedValue(search, 250);
  const fetcher = useFetcher<{ companies: BaseCompany[] }>();

  useEffect(() => {
    fetcher.submit(
      { search: delayedSearch },
      {
        action: '/api/companies',
        method: 'get',
      }
    );
  }, [delayedSearch]);

  const companies = fetcher.data?.companies || [];

  return (
    <Form.Field error={error} label="Organization" labelFor={name} required>
      <Combobox
        defaultDisplayValue={defaultValue.name}
        defaultValue={defaultValue.crunchbaseId}
      >
        <ComboboxInput
          id={name}
          name={name}
          onChange={(e) => setSearch(e.currentTarget.value)}
          required
        />
        <ComboboxPopover>
          <ul>
            {companies.map((company) => (
              <ComboboxItem
                className="whitespace-nowrap [&>button]:flex [&>button]:items-center"
                displayValue={company.name}
                key={company.crunchbaseId}
                onSelect={() => setIsOtherCompany(false)}
                value={company.crunchbaseId}
              >
                <img
                  alt={company.name}
                  className="mr-2 h-6 w-6 rounded"
                  src={company.imageUrl}
                />
                {company.name}
                <span className="ml-1 box-border max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-gray-400">
                  - {company.description}
                </span>
              </ComboboxItem>
            ))}
            <ComboboxItem onSelect={() => setIsOtherCompany(true)} value="">
              Other
            </ComboboxItem>
          </ul>
        </ComboboxPopover>
      </Combobox>
    </Form.Field>
  );
};
