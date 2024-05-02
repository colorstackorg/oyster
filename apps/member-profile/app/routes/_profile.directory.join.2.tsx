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

import { nullableField, Student } from '@oyster/types';
import { Button, Divider, getActionErrors, validateForm } from '@oyster/ui';

import {
  JoinDirectoryBackButton,
  JoinDirectoryNextButton,
} from './_profile.directory.join';
import {
  EthnicityField,
  HometownField,
} from '../shared/components/profile.personal';
import { Route } from '../shared/constants';
import { updateMember } from '../shared/core.server';
import { getMember, getMemberEthnicities } from '../shared/queries';
import { ensureUserAuthenticated, user } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = user(session);

  const [ethnicities, student] = await Promise.all([
    getMemberEthnicities(id),
    getMember(id)
      .select(['hometown', 'hometownCoordinates'])
      .executeTakeFirstOrThrow(),
  ]);

  return json({
    ethnicities,
    student,
  });
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

  return redirect(Route['/directory/join/3']);
}

const {
  ethnicities: ethnicitiesKey,
  hometown,
  hometownLatitude,
  hometownLongitude,
} = UpdatePersonalInformation.keyof().enum;

export default function UpdatePersonalInformationForm() {
  const { ethnicities, student } = useLoaderData<typeof loader>();
  const { errors } = getActionErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
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

      <Button.Group spacing="between">
        <JoinDirectoryBackButton to={Route['/directory/join/1']} />
        <JoinDirectoryNextButton />
      </Button.Group>
    </RemixForm>
  );
}
