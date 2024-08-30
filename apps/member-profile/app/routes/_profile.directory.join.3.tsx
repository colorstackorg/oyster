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
import { nullableField, Student } from '@oyster/types';
import { Button, getErrors, InputField, validateForm } from '@oyster/ui';

import {
  JoinDirectoryBackButton,
  JoinDirectoryNextButton,
} from '@/routes/_profile.directory.join';
import { Route } from '@/shared/constants';
import { getMember } from '@/shared/queries';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const student = await getMember(user(session))
    .select([
      'calendlyUrl',
      'githubUrl',
      'instagramHandle',
      'linkedInUrl',
      'personalWebsiteUrl',
      'twitterHandle',
    ])
    .executeTakeFirstOrThrow();

  return json({
    student,
  });
}

const UpdateSocialsInformation = z.object({
  calendlyUrl: nullableField(Student.shape.calendlyUrl),
  githubUrl: nullableField(Student.shape.githubUrl),
  instagramHandle: nullableField(Student.shape.instagramHandle),
  linkedInUrl: Student.shape.linkedInUrl,
  personalWebsiteUrl: nullableField(Student.shape.personalWebsiteUrl),
  twitterHandle: nullableField(Student.shape.twitterHandle),
});

type UpdateSocialsInformation = z.infer<typeof UpdateSocialsInformation>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    UpdateSocialsInformation
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await updateMember({
    data,
    where: { id: user(session) },
  });

  return redirect(Route['/directory/join/4']);
}

const keys = UpdateSocialsInformation.keyof().enum;

export default function UpdateSocialsInformationForm() {
  const { student } = useLoaderData<typeof loader>();
  const { errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <InputField
        defaultValue={student.linkedInUrl || undefined}
        error={errors.linkedInUrl}
        label="LinkedIn URL"
        name={keys.linkedInUrl}
        required
      />
      <InputField
        defaultValue={student.instagramHandle || undefined}
        error={errors.instagramHandle}
        label="Instagram Handle"
        name={keys.instagramHandle}
      />
      <InputField
        defaultValue={student.twitterHandle || undefined}
        error={errors.twitterHandle}
        label="Twitter Handle"
        name={keys.twitterHandle}
      />
      <InputField
        defaultValue={student.githubUrl || undefined}
        error={errors.githubUrl}
        label="GitHub URL"
        name={keys.githubUrl}
      />
      <InputField
        defaultValue={student.calendlyUrl || undefined}
        error={errors.calendlyUrl}
        label="Calendly URL"
        name={keys.calendlyUrl}
      />
      <InputField
        defaultValue={student.personalWebsiteUrl || undefined}
        error={errors.personalWebsiteUrl}
        label="Personal Website"
        name={keys.personalWebsiteUrl}
      />

      <Button.Group spacing="between">
        <JoinDirectoryBackButton to={Route['/directory/join/2']} />
        <JoinDirectoryNextButton>Next</JoinDirectoryNextButton>
      </Button.Group>
    </RemixForm>
  );
}
