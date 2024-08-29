import { Form as RemixForm } from '@remix-run/react';
import { Link, useFetcher } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { Star } from 'react-feather';

import {
  AddCompanyReviewInput,
  type EditCompanyReviewInput,
} from '@oyster/core/employment';
import {
  Button,
  Checkbox,
  cx,
  Divider,
  type FieldProps,
  Form,
  Radio,
  Select,
  Text,
  Textarea,
} from '@oyster/ui';

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
    <RemixForm className="form" data-gap="2rem" method="post">
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
      <AnonymousField error={errors.anonymous} name={keys.anonymous} />
      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Save</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}

type EditReviewFormProps = Omit<AddReviewFormProps, 'showExperienceField'> & {
  review: Pick<
    EditCompanyReviewInput,
    'anonymous' | 'rating' | 'recommend' | 'text'
  >;
};

export function EditReviewForm({ error, errors, review }: EditReviewFormProps) {
  return (
    <RemixForm className="form" data-gap="2rem" method="post">
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
      <AnonymousField
        defaultValue={review.anonymous}
        error={errors.anonymous}
        name={keys.anonymous}
      />

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Save</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}

// Fields

function AnonymousField({ defaultValue, error, name }: FieldProps<boolean>) {
  return (
    <Form.Field
      description="Your name will not be visible to the public."
      error={error}
      label="Would you like to post this review anonymously?"
      labelFor={name}
    >
      <Checkbox
        color="amber-100"
        defaultChecked={defaultValue}
        label="Post this review anonymously."
        id={name}
        name={name}
        value="1"
      />
    </Form.Field>
  );
}

function ExperienceField({ defaultValue, error, name }: FieldProps<string>) {
  const fetcher = useFetcher<GetWorkExperiencesResult>();

  useEffect(() => {
    fetcher.load('/api/me/work-experiences');
  }, []);

  const experiences = fetcher.data?.experiences || [];

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
            <option
              disabled={experience.hasReviewed}
              key={experience.id}
              value={experience.id}
            >
              {experience.title}, {experience.company}
            </option>
          );
        })}
      </Select>
    </Form.Field>
  );
}

function RatingField({ defaultValue, error, name }: FieldProps<number>) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const [selectedRating, setSelectedRating] = useState<number | null>(
    defaultValue || null
  );

  return (
    <Form.Field
      error={error}
      label="On a scale from 1-10, how would you rate this experience?"
      labelFor={name}
      required
    >
      <div className="flex">
        {Array.from({ length: 10 }).map((_, index) => {
          const value = index + 1;

          return (
            <button
              key={index}
              onClick={() => setSelectedRating(value)}
              onMouseOver={() => setHoveredRating(value)}
              onMouseOut={() => setHoveredRating(null)}
              type="button"
            >
              <Star
                className={cx(
                  'fill-gray-300 text-gray-300 transition-colors',

                  !!hoveredRating &&
                    hoveredRating >= value &&
                    'fill-yellow-500 text-yellow-500',

                  !hoveredRating &&
                    !!selectedRating &&
                    selectedRating >= value &&
                    'fill-yellow-500 text-yellow-500'
                )}
                size="24"
              />
            </button>
          );
        })}
      </div>

      <input name={name} type="hidden" value={selectedRating || ''} />
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
          id={name + '0'}
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
          Should be at least 750 characters. Feel free to use these guiding
          questions:
          <ul className="my-2 list-disc ps-8">
            <li>What was the company culture like?</li>
            <li>Did you feel supported as an employee?</li>
            <li>What did you work on?</li>
            <li>Were you able to develop any new skills?</li>
          </ul>
          See a sample review{' '}
          <a
            className="link"
            href="/images/company-sample-review.png"
            target="_blank"
            rel="noopener noreferrer"
          >
            here
          </a>
          .
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
        minLength={750}
        minRows={10}
        name={name}
        required
      />
    </Form.Field>
  );
}
