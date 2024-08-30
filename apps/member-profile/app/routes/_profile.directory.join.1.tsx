import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';
import { z } from 'zod';

import { updateMember } from '@oyster/core/member-profile/server';
import { Student } from '@oyster/types';
import {
  Button,
  Checkbox,
  Divider,
  Form,
  getErrors,
  InputField,
  Link,
  Text,
  type TextProps,
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

  return json({
    student,
  });
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

  return redirect(Route['/directory/join/2']);
}

const keys = UpdateGeneralInformation.keyof().enum;

export default function UpdateGeneralInformationForm() {
  const { student } = useLoaderData<typeof loader>();
  const { errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
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

      <Divider />

      <Form.Field
        description={<HistoryFieldDescription />}
        labelFor="history"
        label="Work + Education History"
        required
      >
        <Checkbox
          defaultChecked
          id="history"
          label="I have updated my work and education history."
          name="history"
          required
          value="1"
        />
      </Form.Field>

      <Button.Group>
        <JoinDirectoryNextButton />
      </Button.Group>
    </RemixForm>
  );
}

function HistoryFieldDescription(props: TextProps) {
  return (
    <Text {...props}>
      Please ensure that you have updated your{' '}
      <Link href={Route['/profile/work']} target="_blank">
        work history
      </Link>{' '}
      and{' '}
      <Link href={Route['/profile/education']} target="_blank">
        education history
      </Link>
      .
    </Text>
  );
}
