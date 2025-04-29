import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData,
} from '@remix-run/react';
import { z } from 'zod';

import { updateMember } from '@oyster/core/member-profile/server';
import { db } from '@oyster/db';
import { Student } from '@oyster/types';
import {
  Button,
  ErrorMessage,
  Field,
  getErrors,
  Input,
  Modal,
  PhoneNumberInput,
  validateForm,
} from '@oyster/ui';

import {
  BackButton,
  ContinueButton,
  OnboardingButtonGroup,
  SectionTitle,
} from '@/routes/_public.onboarding';
import {
  CurrentLocationField,
  PreferredNameField,
} from '@/shared/components/profile.general';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

const Step = z
  .enum(['personal', 'education', 'social', 'work'])
  .default('personal')
  .catch('personal');

type Step = z.infer<typeof Step>;

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);
  const searchParams = new URL(request.url).searchParams;

  const stepParam = searchParams.get('step');
  const step = Step.parse(stepParam);

  const member = await db
    .selectFrom('students')
    .where('id', '=', user(session))
    .select([
      'currentLocation',
      'currentLocationCoordinates',
      'firstName',
      'lastName',
      'phoneNumber',
      'preferredName',
    ])
    .executeTakeFirst();

  if (!member) {
    return redirect(Route['/login']);
  }

  return json({ member, step });
}

const OnboardingGeneralInformation = Student.pick({
  firstName: true,
  lastName: true,
  preferredName: true,
  phoneNumber: true,
}).extend({
  currentLocation: Student.shape.currentLocation.unwrap(),
  currentLocationLatitude: Student.shape.currentLocationLatitude.unwrap(),
  currentLocationLongitude: Student.shape.currentLocationLongitude.unwrap(),
});

type OnboardingGeneralInformation = z.infer<
  typeof OnboardingGeneralInformation
>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    OnboardingGeneralInformation
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await updateMember({
    data,
    where: { id: user(session) },
  });

  return redirect(Route['/onboarding/emails']);
}

export default function OnboardingGeneralForm() {
  const { member } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { errors } = getErrors(actionData);

  return (
    <Form className="form" method="post">
      <SectionTitle>General Information</SectionTitle>

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

      <Field
        description="Enter your 10-digit phone number. We'll use this to send you important ColorStack updates."
        error={errors.phoneNumber}
        label="Phone Number"
        labelFor="phoneNumber"
      >
        <PhoneNumberInput
          defaultValue={member.phoneNumber || undefined}
          id="phoneNumber"
          name="phoneNumber"
        />
      </Field>

      <OnboardingButtonGroup>
        <BackButton to="/onboarding" />
        <ContinueButton />
      </OnboardingButtonGroup>
    </Form>
  );
}
