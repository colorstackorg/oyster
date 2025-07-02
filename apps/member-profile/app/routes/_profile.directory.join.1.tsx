import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { updateMember } from '@oyster/core/member-profile/server';
import { Student } from '@oyster/types';
import {
  Button,
  Divider,
  getErrors,
  InputField,
  validateForm,
} from '@oyster/ui';

import { JoinDirectoryNextButton } from '@/routes/_profile.directory.join';
import { CurrentLocationField } from '@/shared/components/profile.general';
import { Route } from '@/shared/constants';
import { getMember } from '@/shared/queries';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const student = await getMember(user(session))
    .select(['currentLocation', 'currentLocationCoordinates', 'headline'])
    .executeTakeFirstOrThrow();

  return {
    student,
  };
}

const UpdateGeneralInformation = z.object({
  currentLocation: Student.shape.currentLocation.unwrap(),
  currentLocationLatitude: Student.shape.currentLocationLatitude.unwrap(),
  currentLocationLongitude: Student.shape.currentLocationLongitude.unwrap(),
  headline: Student.shape.headline.unwrap(),
});

type UpdateGeneralInformation = z.infer<typeof UpdateGeneralInformation>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, UpdateGeneralInformation);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  await updateMember(user(session), result.data);

  return redirect(Route['/directory/join/2']);
}

const keys = UpdateGeneralInformation.keyof().enum;

export default function UpdateGeneralInformationForm() {
  const { student } = useLoaderData<typeof loader>();
  const { errors } = getErrors(useActionData<typeof action>());

  return (
    <Form className="form" method="post">
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

      <Button.Group>
        <JoinDirectoryNextButton />
      </Button.Group>
    </Form>
  );
}
