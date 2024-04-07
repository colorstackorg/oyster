import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import {
  Link,
  Form as RemixForm,
  useLoaderData,
  useSubmit,
} from '@remix-run/react';
import { type PropsWithChildren, useState } from 'react';
import { z } from 'zod';

import { db } from '@oyster/db';
import {
  Checkbox,
  type FieldProps,
  Form,
  Input,
  Radio,
  Select,
  Text,
  Textarea,
  validateForm,
  useRevalidateOnFocus,
} from '@oyster/ui';
import { iife } from '@oyster/utils';

import { CityCombobox } from '../shared/components/city-combobox';
import { Route } from '../shared/constants';
import { getMember } from '../shared/queries';
import { ensureUserAuthenticated, user } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);

  const [member] = await Promise.all([
    getMember(memberId).select(['email']).executeTakeFirstOrThrow(),
  ]);

  return json({
    email: member.email,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(z.object({}), Object.fromEntries(form));

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  await db.transaction().execute(async (_) => {});

  return json({
    error: '',
    errors,
  });
}

export default function CensusPage() {
  useRevalidateOnFocus();

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col gap-8">
      <Text variant="2xl">ColorStack Census '24</Text>
      <Text className="-mt-4" color="gray-500">
        Thank you for taking the time to complete the ColorStack Annual Census!
        This feedback is extremely valuable to us as we continue to grow and
        improve our community.
      </Text>
      <CensusForm />
    </div>
  );
}

function CensusForm() {
  const { email } = useLoaderData<typeof loader>();

  const submit = useSubmit();

  const [hasInternship, setHasInternship] = useState<boolean>(false);

  return (
    <RemixForm
      className="form gap-[inherit]"
      method="post"
      onBlur={(e) => submit(e.currentTarget)}
    >
      <CensusSection title="Basic Information">
        <Form.Field
          description={
            <Text>
              If you'd like to change your primary email, please do that{' '}
              <Link
                className="link"
                target="_blank"
                to={Route['/profile/emails']}
              >
                here
              </Link>
              .
            </Text>
          }
          error=""
          label="Email"
          labelFor="email"
        >
          <Select
            defaultValue={email}
            disabled
            id="email"
            name="email"
            required
          >
            <option value={email}>{email}</option>
          </Select>
        </Form.Field>
      </CensusSection>

      <Form.Field error="" label="School" labelFor="school" required>
        <Input name="school" required />
      </Form.Field>

      <Form.Field error="" label="Are you an international student?" required>
        <Radio.Group>
          <Radio
            id={'isInternationalStudent' + '1'}
            label="Yes"
            name="isInternationalStudent"
            required
            value="1"
          />
          <Radio
            id={'isInternationalStudent' + '0'}
            label="No"
            name="isInternationalStudent"
            required
            value="0"
          />
        </Radio.Group>
      </Form.Field>

      <Form.Field
        error=""
        label="Do you have an internship this summer?"
        required
      >
        <Radio.Group>
          <Radio
            id={'hasInternship' + '1'}
            label="Yes"
            name="hasInternship"
            onChange={(e) => setHasInternship(e.currentTarget.value === '1')}
            required
            value="1"
          />
          <Radio
            id={'hasInternship' + '0'}
            label="No"
            name="hasInternship"
            onChange={(e) => setHasInternship(e.currentTarget.value === '1')}
            required
            value="0"
          />
        </Radio.Group>
      </Form.Field>

      {hasInternship && (
        <Form.Field
          error=""
          label="What company will you be working with?"
          labelFor="company"
          required
        >
          <Input name="company" required />
        </Form.Field>
      )}

      {hasInternship && (
        <Form.Field
          error=""
          label="If you received multiple offers, list out the additional companies."
          labelFor="additionalCompanies"
        >
          <Input name="additionalCompanies" />
        </Form.Field>
      )}

      <Form.Field
        description="This will help us plan for our in-person events this summer."
        error=""
        label="What city will you be in this summer?"
        labelFor="location"
        required
      >
        <CityCombobox
          defaultLatitude={undefined}
          defaultLongitude={undefined}
          defaultValue={undefined}
          name="location"
          latitudeName="locationLatitude"
          longitudeName="locationLongitude"
          required
        />
      </Form.Field>

      <Form.Field
        error=""
        label="Which resources have been the most beneficial to you?"
        required
      >
        {iife(() => {
          const resources = [
            'AlgoExpert',
            'Wiki',
            'Fam Fridays',
            'Slack',
            'Newsletter',
            'InterviewPen',
            'CompSciLib',
          ];

          return (
            <Checkbox.Group>
              {resources.map((resource) => {
                return (
                  <Checkbox
                    key={resource}
                    defaultChecked={undefined}
                    id={'currentResources' + resource}
                    label={resource}
                    name="currentResources"
                    value={resource}
                  />
                );
              })}
            </Checkbox.Group>
          );
        })}
      </Form.Field>

      <Form.Field
        error=""
        label="Which resources would you like to see added?"
        labelFor="futureResources"
        required
      >
        <Textarea
          defaultValue={undefined}
          id="futureResources"
          name="futureResources"
          minRows={2}
          required
        />
      </Form.Field>

      <Form.Field
        error=""
        label="My confidence in computer science related school work has increased since joining ColorStack."
        required
      >
        <AgreeRating name="confidenceRatingSchool" />
      </Form.Field>

      <Form.Field
        error=""
        label="My confidence in technical interviewing has increased since joining ColorStack."
        required
      >
        <AgreeRating name="confidenceRatingInterviewing" />
      </Form.Field>

      <Form.Field
        error=""
        label="I am confident that I will graduate with a full time offer in tech."
        required
      >
        <AgreeRating name="confidenceRatingFullTimeJob" />
      </Form.Field>

      <Form.Field
        error=""
        label="I am confident that I will graduate with my tech related degree."
        required
      >
        <AgreeRating name="confidenceRatingGraduating" />
      </Form.Field>

      <Form.Field
        error=""
        label="As a ColorStack member, what are you looking for most in the ColorStack community?"
        required
      >
        {iife(() => {
          const categories = [
            'Career development (interview prep, resume review, etc.)',
            'Access to opportunities',
            'Academic help',
            'Fellowship + networking',
          ];

          return (
            <Radio.Group>
              {categories.map((category) => {
                return (
                  <Radio
                    key={category}
                    defaultChecked={undefined}
                    id={'wants' + category}
                    label={category}
                    name="wants"
                    required
                    value={category}
                  />
                );
              })}
            </Radio.Group>
          );
        })}
      </Form.Field>
    </RemixForm>
  );
}

function CensusSection({
  children,
  title,
}: PropsWithChildren<{ title: string }>) {
  return (
    <section className="flex flex-col gap-[inherit]">
      <Text className="-mb-4" color="gray-500" variant="xl">
        {title}
      </Text>

      {children}
    </section>
  );
}

function AgreeRating({ name }: Pick<FieldProps<string>, 'name'>) {
  const ratings = [
    'Strongly agree',
    'Somewhat agree',
    'Neither agree nor disagree',
    'Somewhat disagree',
    'Strongly disagree',
  ];

  return (
    <Checkbox.Group>
      {ratings.map((rating) => {
        return (
          <Radio
            key={rating}
            defaultChecked={undefined}
            id={name + rating}
            label={rating}
            name={name}
            required
            value={rating}
          />
        );
      })}
    </Checkbox.Group>
  );
}
