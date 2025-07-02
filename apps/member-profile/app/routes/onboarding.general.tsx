import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { type z } from 'zod';

import { updateMember } from '@oyster/core/member-profile/server';
import { db } from '@oyster/db';
import { Student } from '@oyster/types';
import { Field, getErrors, Input, validateForm } from '@oyster/ui';

import {
  OnboardingBackButton,
  OnboardingButtonGroup,
  OnboardingContinueButton,
  OnboardingSectionTitle,
} from '@/routes/onboarding';
import {
  CurrentLocationField,
  PreferredNameField,
} from '@/shared/components/profile.general';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const member = await db
    .selectFrom('students')
    .select([
      'currentLocation',
      'currentLocationCoordinates',
      'firstName',
      'lastName',
      'phoneNumber',
      'preferredName',
    ])
    .where('id', '=', user(session))
    .executeTakeFirstOrThrow();

  return { member };
}

const OnboardingGeneralData = Student.pick({
  firstName: true,
  lastName: true,
  preferredName: true,
}).extend({
  currentLocation: Student.shape.currentLocation.unwrap(),
  currentLocationLatitude: Student.shape.currentLocationLatitude.unwrap(),
  currentLocationLongitude: Student.shape.currentLocationLongitude.unwrap(),
});

type OnboardingGeneralData = z.infer<typeof OnboardingGeneralData>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, OnboardingGeneralData);

  if (!result.ok) {
    return json(result, { status: 400 });
  }

  await updateMember(user(session), result.data);

  return redirect(Route['/onboarding/emails']);
}

export default function OnboardingGeneralForm() {
  const { member } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { errors } = getErrors(actionData);

  return (
    <Form className="form" method="post">
      <OnboardingSectionTitle>General Information</OnboardingSectionTitle>

      <Field
        error={errors.firstName}
        label="First Name"
        labelFor="firstName"
        required
      >
        <Input
          defaultValue={member.firstName}
          id="firstName"
          name="firstName"
          required
        />
      </Field>

      <Field
        error={errors.lastName}
        label="Last Name"
        labelFor="lastName"
        required
      >
        <Input
          defaultValue={member.lastName}
          id="lastName"
          name="lastName"
          required
        />
      </Field>

      <PreferredNameField
        defaultValue={member.preferredName || undefined}
        error={errors.preferredName}
        firstName={member.firstName}
        lastName={member.lastName}
        name="preferredName"
      />

      <CurrentLocationField
        defaultValue={member.currentLocation || undefined}
        defaultLatitude={member.currentLocationCoordinates?.y}
        defaultLongitude={member.currentLocationCoordinates?.x}
        error={errors.currentLocation}
        latitudeName="currentLocationLatitude"
        longitudeName="currentLocationLongitude"
        name="currentLocation"
      />

      <OnboardingButtonGroup>
        <OnboardingBackButton to="/onboarding" />
        <OnboardingContinueButton />
      </OnboardingButtonGroup>
    </Form>
  );
}
