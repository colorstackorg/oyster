import { ActionFunctionArgs, json, LoaderFunctionArgs } from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useNavigation,
} from '@remix-run/react';
import { sql } from 'kysely';
import { z } from 'zod';

import {
  Button,
  Divider,
  getActionErrors,
  InputField,
  validateForm,
} from '@oyster/core-ui';
import { Student } from '@oyster/types';

import {
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '../shared/components/profile';
import {
  CurrentLocationField,
  PreferredNameField,
} from '../shared/components/profile.general';
import { db } from '../shared/core.server';
import { track } from '../shared/mixpanel.server';
import { updateGeneralInformation } from '../shared/queries';
import { getMember } from '../shared/queries/index';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '../shared/session.server';

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
      'preferredName',
    ])
    .executeTakeFirstOrThrow();

  track(request, 'Page Viewed', {
    Page: 'Profile - General',
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
}).extend({
  currentLocation: Student.shape.currentLocation.unwrap(),
  currentLocationLatitude: Student.shape.currentLocationLatitude.unwrap(),
  currentLocationLongitude: Student.shape.currentLocationLongitude.unwrap(),
});

type UpdateGeneralInformation = z.infer<typeof UpdateGeneralInformation>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  let { data, errors } = validateForm(
    UpdateGeneralInformation,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Please fix the errors above.',
      errors,
    });
  }

  let { currentLocationLatitude, currentLocationLongitude, ...rest } = data;

  await db.transaction().execute(async (trx) => {
    await updateGeneralInformation(trx, user(session), {
      ...rest,
      currentLocationCoordinates: sql`point(${currentLocationLongitude}, ${currentLocationLatitude})`,
    });
  });

  toast(session, {
    message: 'Updated!',
    type: 'success',
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

const {
  currentLocation,
  currentLocationLatitude,
  currentLocationLongitude,
  firstName,
  headline,
  lastName,
  preferredName,
} = UpdateGeneralInformation.keyof().enum;

export default function UpdateGeneralInformationSection() {
  const { errors } = getActionErrors(useActionData<typeof action>());
  const { student } = useLoaderData<typeof loader>();
  const submitting = useNavigation().state === 'submitting';

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
          name={firstName}
          required
        />
        <InputField
          defaultValue={student.lastName}
          error={errors.lastName}
          label="Last Name"
          name={lastName}
          required
        />
        <PreferredNameField
          defaultValue={student.preferredName || undefined}
          error={errors.preferredName}
          firstName={student.firstName}
          lastName={student.lastName}
          name={preferredName}
        />

        <Divider />

        <InputField
          defaultValue={student.headline || undefined}
          description="A LinkedIn-style headline."
          error={errors.headline}
          label="Headline"
          name={headline}
          placeholder="Incoming SWE Intern @ Google | Cornell '26"
          required
        />

        <Divider />

        <CurrentLocationField
          defaultLatitude={student.currentLocationCoordinates?.y}
          defaultLongitude={student.currentLocationCoordinates?.x}
          defaultValue={student.currentLocation || undefined}
          error={errors.currentLocation}
          name={currentLocation}
          latitudeName={currentLocationLatitude}
          longitudeName={currentLocationLongitude}
        />

        <Button.Group>
          <Button loading={submitting} type="submit">
            Save
          </Button>
        </Button.Group>
      </RemixForm>
    </ProfileSection>
  );
}
