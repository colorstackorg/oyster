import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { updateMember } from '@oyster/core/member-profile/server';
import { nullableField, Student } from '@oyster/types';
import { Button, Divider, getErrors, validateForm } from '@oyster/ui';

import {
  JoinDirectoryBackButton,
  JoinDirectoryNextButton,
} from '@/routes/_profile.directory.join';
import {
  EthnicityField,
  HometownField,
} from '@/shared/components/profile.personal';
import { Route } from '@/shared/constants';
import { getMember, getMemberEthnicities } from '@/shared/queries';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = user(session);

  const [ethnicities, student] = await Promise.all([
    getMemberEthnicities(id),
    getMember(id)
      .select(['hometown', 'hometownCoordinates'])
      .executeTakeFirstOrThrow(),
  ]);

  return {
    ethnicities,
    student,
  };
}

const UpdatePersonalInformation = z.object({
  ethnicities: nullableField(
    z
      .string()
      .trim()
      .transform((value) => value.split(','))
      .nullable()
  ),
  hometown: Student.shape.hometown.unwrap(),
  hometownLatitude: Student.shape.hometownLatitude.unwrap(),
  hometownLongitude: Student.shape.hometownLongitude.unwrap(),
});

type UpdatePersonalInformation = z.infer<typeof UpdatePersonalInformation>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, UpdatePersonalInformation);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  await updateMember(user(session), {
    ...result.data,
    ethnicities: result.data.ethnicities || [],
  });

  return redirect(Route['/directory/join/3']);
}

const keys = UpdatePersonalInformation.keyof().enum;

export default function UpdatePersonalInformationForm() {
  const { ethnicities, student } = useLoaderData<typeof loader>();
  const { errors } = getErrors(useActionData<typeof action>());

  return (
    <Form className="form" method="post">
      <HometownField
        defaultLatitude={student.hometownCoordinates?.y}
        defaultLongitude={student.hometownCoordinates?.x}
        defaultValue={student.hometown || undefined}
        error={errors.hometown}
        name={keys.hometown}
        latitudeName={keys.hometownLatitude}
        longitudeName={keys.hometownLongitude}
        required
      />

      <Divider />

      <EthnicityField
        defaultValue={ethnicities}
        error={errors.ethnicities}
        name={keys.ethnicities}
      />

      <Button.Group spacing="between">
        <JoinDirectoryBackButton to={Route['/directory/join/1']} />
        <JoinDirectoryNextButton />
      </Button.Group>
    </Form>
  );
}
