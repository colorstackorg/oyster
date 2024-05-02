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
import { sql } from 'kysely';
import { z } from 'zod';

import { ISO8601Date, nullableField, Student } from '@oyster/types';
import {
  Button,
  Divider,
  getActionErrors,
  InputField,
  validateForm,
} from '@oyster/ui';

import {
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '../shared/components/profile';
import {
  BirthdateField,
  BirthdateNotificationField,
  EthnicityField,
  GenderField,
  HometownField,
} from '../shared/components/profile.personal';
import { updateMember } from '../shared/core.server';
import { getMember, getMemberEthnicities } from '../shared/queries';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = user(session);

  const [ethnicities, student] = await Promise.all([
    getMemberEthnicities(id),
    getMember(id)
      .select([
        sql<string>`to_char(birthdate, 'YYYY-MM-DD')`.as('birthdate'),
        'birthdateNotification',
        'gender',
        'genderPronouns',
        'hometown',
        'hometownCoordinates',
      ])
      .executeTakeFirstOrThrow(),
  ]);

  return json({
    ethnicities,
    student,
  });
}

const UpdatePersonalInformation = Student.pick({
  gender: true,
}).extend({
  birthdate: nullableField(ISO8601Date.nullable()),
  birthdateNotification: z.preprocess((value) => value === '1', z.boolean()),
  ethnicities: nullableField(
    z
      .string()
      .trim()
      .transform((value) => value.split(','))
      .nullable()
  ),
  genderPronouns: nullableField(Student.shape.genderPronouns),
  hometown: Student.shape.hometown.unwrap(),
  hometownLatitude: Student.shape.hometownLatitude.unwrap(),
  hometownLongitude: Student.shape.hometownLongitude.unwrap(),
});

type UpdatePersonalInformation = z.infer<typeof UpdatePersonalInformation>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    UpdatePersonalInformation,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  await updateMember({
    data: { ...data, ethnicities: data.ethnicities || [] },
    where: { id: user(session) },
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
  birthdate,
  birthdateNotification,
  ethnicities: ethnicitiesKey,
  hometown,
  hometownLatitude,
  hometownLongitude,
  gender,
  genderPronouns,
} = UpdatePersonalInformation.keyof().enum;

export default function UpdatePersonalInformationForm() {
  const { ethnicities, student } = useLoaderData<typeof loader>();
  const { errors } = getActionErrors(useActionData<typeof action>());

  return (
    <ProfileSection>
      <ProfileHeader>
        <ProfileTitle>Personal</ProfileTitle>
      </ProfileHeader>

      <RemixForm className="form" method="post">
        <GenderField
          defaultValue={student.gender}
          error={errors.gender}
          name={gender}
        />
        <InputField
          defaultValue={student.genderPronouns || undefined}
          description="Let others know how to refer to you."
          error={errors.genderPronouns}
          name={genderPronouns}
          label="Pronouns"
          placeholder="ex: she/her/hers"
        />

        <Divider />

        <BirthdateField
          defaultValue={student.birthdate || undefined}
          error={errors.birthdate}
          name={birthdate}
        />
        <BirthdateNotificationField
          defaultValue={student.birthdateNotification}
          error={errors.birthdateNotification}
          name={birthdateNotification}
        />

        <Divider />

        <HometownField
          defaultLatitude={student.hometownCoordinates?.y}
          defaultLongitude={student.hometownCoordinates?.x}
          defaultValue={student.hometown || undefined}
          error={errors.hometown}
          name={hometown}
          latitudeName={hometownLatitude}
          longitudeName={hometownLongitude}
        />

        <Divider />

        <EthnicityField
          defaultValue={ethnicities}
          error={errors.ethnicities}
          name={ethnicitiesKey}
        />

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </RemixForm>
    </ProfileSection>
  );
}
