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

import { updateMember } from '@oyster/core/member-profile/server';
import { ISO8601Date, nullableField, Student } from '@oyster/types';
import {
  Button,
  Divider,
  getErrors,
  InputField,
  validateForm,
} from '@oyster/ui';

import {
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '@/shared/components/profile';
import {
  BirthdateField,
  BirthdateNotificationField,
  EthnicityField,
  GenderField,
  HometownField,
} from '@/shared/components/profile.personal';
import { getMember, getMemberEthnicities } from '@/shared/queries';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

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

  const { data, errors, ok } = await validateForm(
    request,
    UpdatePersonalInformation
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await updateMember({
    data: { ...data, ethnicities: data.ethnicities || [] },
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

const keys = UpdatePersonalInformation.keyof().enum;

export default function UpdatePersonalInformationForm() {
  const { ethnicities, student } = useLoaderData<typeof loader>();
  const { errors } = getErrors(useActionData<typeof action>());

  return (
    <ProfileSection>
      <ProfileHeader>
        <ProfileTitle>Personal</ProfileTitle>
      </ProfileHeader>

      <RemixForm className="form" method="post">
        <GenderField
          defaultValue={student.gender}
          error={errors.gender}
          name={keys.gender}
        />
        <InputField
          defaultValue={student.genderPronouns || undefined}
          description="Let others know how to refer to you."
          error={errors.genderPronouns}
          name={keys.genderPronouns}
          label="Pronouns"
          placeholder="ex: she/her/hers"
        />

        <Divider />

        <BirthdateField
          defaultValue={student.birthdate || undefined}
          error={errors.birthdate}
          name={keys.birthdate}
        />
        <BirthdateNotificationField
          defaultValue={student.birthdateNotification}
          error={errors.birthdateNotification}
          name={keys.birthdateNotification}
        />

        <Divider />

        <HometownField
          defaultLatitude={student.hometownCoordinates?.y}
          defaultLongitude={student.hometownCoordinates?.x}
          defaultValue={student.hometown || undefined}
          error={errors.hometown}
          name={keys.hometown}
          latitudeName={keys.hometownLatitude}
          longitudeName={keys.hometownLongitude}
        />

        <Divider />

        <EthnicityField
          defaultValue={ethnicities}
          error={errors.ethnicities}
          name={keys.ethnicities}
        />

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </RemixForm>
    </ProfileSection>
  );
}
