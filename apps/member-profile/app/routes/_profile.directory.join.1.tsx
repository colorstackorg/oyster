import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
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
  Checkbox,
  Divider,
  Form,
  getActionErrors,
  InputField,
  Link,
  Text,
  TextProps,
  validateForm,
} from '@colorstack/core-ui';
import { Student } from '@colorstack/types';

import { CurrentLocationField } from '../shared/components/profile.general';
import { Route } from '../shared/constants';
import { db } from '../shared/core.server';
import { getMember, updateGeneralInformation } from '../shared/queries';
import { ensureUserAuthenticated, user } from '../shared/session.server';
import { JoinDirectoryNextButton } from './_profile.directory.join';

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

  const form = await request.formData();

  const { data, errors } = validateForm(
    UpdateGeneralInformation,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  await db.transaction().execute(async (trx) => {
    await updateGeneralInformation(trx, user(session), {
      currentLocation: data.currentLocation,
      currentLocationCoordinates: sql`point(${data.currentLocationLongitude}, ${data.currentLocationLatitude})`,
      headline: data.headline,
    });
  });

  return redirect(Route['/directory/join/2']);
}

const {
  currentLocation,
  currentLocationLatitude,
  currentLocationLongitude,
  headline,
} = UpdateGeneralInformation.keyof().enum;

export default function UpdateGeneralInformationForm() {
  const { student } = useLoaderData<typeof loader>();
  const { errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

  return (
    <RemixForm className="form" method="post">
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
        <JoinDirectoryNextButton submitting={submitting} />
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
