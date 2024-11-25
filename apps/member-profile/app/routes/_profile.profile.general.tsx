import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';
import { type z } from 'zod';

import { updateMember } from '@oyster/core/member-profile/server';
import { track } from '@oyster/core/mixpanel';
import { Student } from '@oyster/types';
import {
  Button,
  Divider,
  Form,
  getErrors,
  InputField,
  PhoneNumberInput,
  validateForm,
} from '@oyster/ui';

import {
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '@/shared/components/profile';
import {
  CurrentLocationField,
  PreferredNameField,
} from '@/shared/components/profile.general';
import { getMember } from '@/shared/queries/index';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = user(session);

  const student = await getMember(id)
    .select([
      'currentLocation',
      'currentLocationCoordinates',
      'firstName',
      'gender',
      'genderPronouns',
      'headline',
      'lastName',
      'phoneNumber',
      'preferredName',
    ])
    .executeTakeFirstOrThrow();

  track({
    event: 'Page Viewed',
    properties: { Page: 'Profile' },
    request,
    user: id,
  });

  return json({
    student,
  });
}

const UpdateGeneralInformation = Student.pick({
  firstName: true,
  headline: true,
  lastName: true,
  preferredName: true,
  phoneNumber: true,
}).extend({
  currentLocation: Student.shape.currentLocation.unwrap(),
  currentLocationLatitude: Student.shape.currentLocationLatitude.unwrap(),
  currentLocationLongitude: Student.shape.currentLocationLongitude.unwrap(),
});

type UpdateGeneralInformation = z.infer<typeof UpdateGeneralInformation>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    UpdateGeneralInformation
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await updateMember({
    data,
    where: { id: user(session) },
  });

  toast(session, {
    message: 'Updated!',
  });

  return json(
    {
      error: '',
      errors,
    },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

const keys = UpdateGeneralInformation.keyof().enum;

export default function UpdateGeneralInformationSection() {
  const { errors } = getErrors(useActionData<typeof action>());
  const { student } = useLoaderData<typeof loader>();

  return (
    <ProfileSection>
      <ProfileHeader>
        <ProfileTitle>General</ProfileTitle>
      </ProfileHeader>

      <RemixForm className="form" method="post">
        <InputField
          defaultValue={student.firstName}
          error={errors.firstName}
          label="First Name"
          name={keys.firstName}
          required
        />
        <InputField
          defaultValue={student.lastName}
          error={errors.lastName}
          label="Last Name"
          name={keys.lastName}
          required
        />
        <PreferredNameField
          defaultValue={student.preferredName || undefined}
          error={errors.preferredName}
          firstName={student.firstName}
          lastName={student.lastName}
          name={keys.preferredName}
        />

        <Divider />

        <InputField
          defaultValue={student.headline || undefined}
          description="A LinkedIn-style headline."
          error={errors.headline}
          label="Headline"
          name={keys.headline}
          placeholder="Incoming SWE Intern @ Google | Cornell '26"
          required
        />

        <Divider />

        <CurrentLocationField
          defaultLatitude={student.currentLocationCoordinates?.y}
          defaultLongitude={student.currentLocationCoordinates?.x}
          defaultValue={student.currentLocation || undefined}
          error={errors.currentLocation}
          name={keys.currentLocation}
          latitudeName={keys.currentLocationLatitude}
          longitudeName={keys.currentLocationLongitude}
        />

        <Form.Field
          description="Enter your 10-digit phone number. We'll use this to send you important ColorStack updates."
          error={errors.phoneNumber}
          label="Phone Number"
          labelFor={keys.phoneNumber}
        >
          <PhoneNumberInput
            defaultValue={student.phoneNumber || undefined}
            id={keys.phoneNumber}
            name={keys.phoneNumber}
          />
        </Form.Field>

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </RemixForm>
    </ProfileSection>
  );
}
