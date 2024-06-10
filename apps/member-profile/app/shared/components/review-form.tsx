import { Form as RemixForm } from '@remix-run/react';
import { Link, useFetcher } from '@remix-run/react';
import { useEffect } from 'react';

import {
  AddCompanyReviewInput,
  type EditCompanyReviewInput,
} from '@oyster/core/employment';
import {
  Button,
  Divider,
  type FieldProps,
  Form,
  Radio,
  Select,
  Text,
  Textarea,
} from '@oyster/ui';
import { Slider } from '@oyster/ui/slider';

import { type GetWorkExperiencesResult } from '@/routes/api.me.work-experiences';
import { Route } from '@/shared/constants';

const keys = AddCompanyReviewInput.keyof().enum;

// Forms

type AddReviewFormProps = {
  error?: string;
  errors: Partial<Record<keyof AddCompanyReviewInput, string>>;
  showExperienceField?: boolean;
};

export function AddReviewForm({
  error,
  errors,
  showExperienceField,
}: AddReviewFormProps) {
  return (
    <RemixForm className="form" method="post">
      {showExperienceField && (
        <ExperienceField
          error={errors.workExperienceId}
          name={keys.workExperienceId}
        />
      )}

      <TextField error={errors.text} name={keys.text} />

      <Divider />

      <RatingField error={errors.rating} name={keys.rating} />
      <RecommendField error={errors.recommend} name={keys.recommend} />

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Save</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}

type EditReviewFormProps = Omit<AddReviewFormProps, 'showExperienceField'> & {
  review: Pick<EditCompanyReviewInput, 'rating' | 'recommend' | 'text'>;
};

export function EditReviewForm({ error, errors, review }: EditReviewFormProps) {
  return (
    <RemixForm className="form" method="post">
      <TextField
        defaultValue={review.text}
        error={errors.text}
        name={keys.text}
      />

      <Divider />

      <RatingField
        defaultValue={review.rating}
        error={errors.rating}
        name={keys.rating}
      />
      <RecommendField
        defaultValue={review.recommend}
        error={errors.recommend}
        name={keys.recommend}
      />

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Save</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}

// Fields

function ExperienceField({ defaultValue, error, name }: FieldProps<string>) {
  const fetcher = useFetcher<GetWorkExperiencesResult>();

  useEffect(() => {
    fetcher.load('/api/me/work-experiences');
  }, []);

  const experiences = fetcher.data?.experiences || [];

  // TODO: Need to know if experience was already reviewed or not...

  return (
    <Form.Field
      description={
        <Text>
          If you can't find the work experience you're looking for, you'll need
          to add it to your{' '}
          <Link className="link" to={Route['/profile/work']}>
            work history
          </Link>{' '}
          first.
        </Text>
      }
      error={error}
      label="Choose a work experience to review."
      labelFor={name}
      required
    >
      <Select defaultValue={defaultValue} id={name} name={name} required>
        {experiences.map((experience) => {
          return (
            <option key={experience.id} value={experience.id}>
              {experience.title}, {experience.company}
            </option>
          );
        })}
      </Select>
    </Form.Field>
  );
}

function RatingField({ defaultValue, error, name }: FieldProps<number>) {
  return (
    <Form.Field
      error={error}
      label="On a scale from 1-10, how would you rate this experience?"
      labelFor={name}
      required
    >
      <Slider
        aria-required="true"
        defaultValue={defaultValue ? [defaultValue] : undefined}
        id={name}
        min={1}
        max={10}
        name={name}
        step={1}
      />
    </Form.Field>
  );
}

function RecommendField({ defaultValue, error, name }: FieldProps<boolean>) {
  return (
    <Form.Field
      error={error}
      label="Would you recommend this company to another ColorStack member?"
      labelFor={name}
      required
    >
      <Radio.Group>
        <Radio
          color="lime-100"
          defaultChecked={defaultValue === true}
          id={name + '1'}
          label="Yes"
          name={name}
          required
          value="1"
        />
        <Radio
          color="red-100"
          defaultChecked={defaultValue === false}
          id={name + '1'}
          label="No"
          name={name}
          required
          value="0"
        />
      </Radio.Group>
    </Form.Field>
  );
}

function TextField({ defaultValue, error, name }: FieldProps<string>) {
  return (
    <Form.Field
      description={
        <div>
          Should be at least 1,000 characters. Feel free to use these guiding
          questions:
          <ul className="mt-2 list-disc ps-8">
            <li>What was the company culture like?</li>
            <li>Did you feel supported as an employee?</li>
            <li>What did you work on?</li>
            <li>Were you able to develop any new skills?</li>
          </ul>
        </div>
      }
      error={error}
      label="Write a review about your experience with this company."
      labelFor={name}
      required
    >
      <Textarea
        defaultValue={defaultValue}
        id={name}
        minLength={1000}
        minRows={10}
        name={name}
        required
      />
    </Form.Field>
  );
}
