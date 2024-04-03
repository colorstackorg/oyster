import { ActionFunctionArgs, json, LoaderFunctionArgs } from '@remix-run/node';
import { Form as RemixForm, useSubmit } from '@remix-run/react';
import { z } from 'zod';

import { db } from '@oyster/db';
import { Form, Input, Text, validateForm } from '@oyster/ui';

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
      <Text variant="2xl">ColorStack Census '24</Text>

      <div className="mx-auto w-full max-w-[600px]">
        <CensusForm />
      </div>
    </>
  );
}

function CensusForm() {
  const submit = useSubmit();

  return (
    <RemixForm
      className="form gap-8"
      method="post"
      onBlur={(e) => submit(e.currentTarget)}
    >
      <Form.Field label="First Name">
        <Input name="firstName" />
      </Form.Field>

      <Form.Field label="Last Name">
        <Input name="lastName" />
      </Form.Field>

      <Form.Field label="Email">
        <Input name="email" />
      </Form.Field>

      <Form.Field label="School">
        <Input name="school" />
      </Form.Field>

      <Form.Field label="Are you an international student?">
        <Input name="isInternationalStudent" />
      </Form.Field>

      <Form.Field label="Do you have an internship this summer?">
        <Input name="hasInternship" />
      </Form.Field>

      <Form.Field label="What company will you be working with?">
        <Input name="company" />
      </Form.Field>

      <Form.Field label="If you received multiple offers, list out the additional companies.">
        <Input name="additionalCompanies" />
      </Form.Field>

      <Form.Field label="What city will you be in this summer?">
        <Input name="location" />
      </Form.Field>

      <Form.Field label="Which resources have been the most beneficial to you?">
        <Input name="currentResources" />
      </Form.Field>

      <Form.Field label="Which resources would you like to see added?">
        <Input name="futureResources" />
      </Form.Field>

      <Form.Field label="My confidence in computer science related school work has increased since joining ColorStack.">
        <Input name="confidenceRatingSchool" />
      </Form.Field>

      <Form.Field label="My confidence in technical interviewing has increased since joining ColorStack.">
        <Input name="confidenceRatingInterviewing" />
      </Form.Field>

      <Form.Field label="I am confident that I will graduate with a full time offer in tech.">
        <Input name="confidenceRatingFullTimeJob" />
      </Form.Field>

      <Form.Field label="I am confident that I will graduate with my tech related degree.">
        <Input name="confidenceRatingGraduating" />
      </Form.Field>

      <Form.Field label="As a ColorStack member, what are you looking for most in the ColorStack community?">
        <Input name="wants" />
      </Form.Field>
    </RemixForm>
  );
}
