import { ActionFunctionArgs, json, LoaderFunctionArgs } from '@remix-run/node';
import { Form as RemixForm, useSubmit } from '@remix-run/react';
import { z } from 'zod';

import { db } from '@oyster/db';
import { Form, Input, Radio, Text, validateForm } from '@oyster/ui';

import { ensureUserAuthenticated } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(z.object({}), Object.fromEntries(form));

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  await db.transaction().execute(async (trx) => {});

  return json({
    error: '',
    errors,
  });
}

export default function CensusPage() {
  return (
    <>
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-8">
        <Text variant="2xl">ColorStack Census '24</Text>
        <Text className="-mt-4" color="gray-500">
          Thank you for taking the time to complete the ColorStack Annual
          Census! This feedback is extremely valuable to us as we continue to
          grow and improve our community.
        </Text>
        <CensusForm />
      </div>
    </>
  );
}

function CensusForm() {
  const submit = useSubmit();

  return (
    <RemixForm
      className="form gap-[inherit]"
      method="post"
      onBlur={(e) => submit(e.currentTarget)}
    >
      <Form.Field error="" label="Email" required>
        <Input name="email" required />
      </Form.Field>

      <Form.Field error="" label="School" required>
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
            defaultChecked
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
        <Input name="hasInternship" required />
      </Form.Field>

      <Form.Field
        error=""
        label="What company will you be working with?"
        required
      >
        <Input name="company" required />
      </Form.Field>

      <Form.Field
        error=""
        label="If you received multiple offers, list out the additional companies."
      >
        <Input name="additionalCompanies" />
      </Form.Field>

      <Form.Field
        error=""
        label="What city will you be in this summer?"
        required
      >
        <Input name="location" required />
      </Form.Field>

      <Form.Field
        error=""
        label="Which resources have been the most beneficial to you?"
        required
      >
        <Input name="currentResources" required />
      </Form.Field>

      <Form.Field
        error=""
        label="Which resources would you like to see added?"
        required
      >
        <Input name="futureResources" required />
      </Form.Field>

      <Form.Field
        error=""
        label="My confidence in computer science related school work has increased since joining ColorStack."
        required
      >
        <Input name="confidenceRatingSchool" required />
      </Form.Field>

      <Form.Field
        error=""
        label="My confidence in technical interviewing has increased since joining ColorStack."
        required
      >
        <Input name="confidenceRatingInterviewing" required />
      </Form.Field>

      <Form.Field
        error=""
        label="I am confident that I will graduate with a full time offer in tech."
        required
      >
        <Input name="confidenceRatingFullTimeJob" required />
      </Form.Field>

      <Form.Field
        error=""
        label="I am confident that I will graduate with my tech related degree."
        required
      >
        <Input name="confidenceRatingGraduating" required />
      </Form.Field>

      <Form.Field
        error=""
        label="As a ColorStack member, what are you looking for most in the ColorStack community?"
        required
      >
        <Input name="wants" required />
      </Form.Field>
    </RemixForm>
  );
}
