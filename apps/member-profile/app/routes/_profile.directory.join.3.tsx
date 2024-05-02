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
import { Button, getActionErrors, InputField, validateForm } from '@oyster/ui';

import {
  JoinDirectoryBackButton,
  JoinDirectoryNextButton,
} from './_profile.directory.join';
import { Route } from '../shared/constants';
import { updateMember } from '../shared/core.server';
import { getMember } from '../shared/queries';
import { ensureUserAuthenticated, user } from '../shared/session.server';
import { formatUrl } from '../shared/url.utils';

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
  calendlyUrl: nullableField(Student.shape.calendlyUrl).transform(formatUrl),
  githubUrl: nullableField(Student.shape.githubUrl).transform(formatUrl),
  instagramHandle: nullableField(Student.shape.instagramHandle),
  linkedInUrl: Student.shape.linkedInUrl.transform(formatUrl),
  personalWebsiteUrl: nullableField(Student.shape.personalWebsiteUrl).transform(
    formatUrl
  ),
  twitterHandle: nullableField(Student.shape.twitterHandle),
});

type UpdateSocialsInformation = z.infer<typeof UpdateSocialsInformation>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    UpdateSocialsInformation,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  await updateMember({
    data,
    where: { id: user(session) },
  });

  return redirect(Route['/directory/join/4']);
}

const {
  calendlyUrl,
  githubUrl,
  instagramHandle,
  linkedInUrl,
  personalWebsiteUrl,
  twitterHandle,
} = UpdateSocialsInformation.keyof().enum;

export default function UpdateSocialsInformationForm() {
  const { student } = useLoaderData<typeof loader>();
  const { errors } = getActionErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <InputField
        defaultValue={student.linkedInUrl || undefined}
        error={errors.linkedInUrl}
        label="LinkedIn URL"
        name={linkedInUrl}
        required
      />
      <InputField
        defaultValue={student.instagramHandle || undefined}
        error={errors.instagramHandle}
        label="Instagram Handle"
        name={instagramHandle}
      />
      <InputField
        defaultValue={student.twitterHandle || undefined}
        error={errors.twitterHandle}
        label="Twitter Handle"
        name={twitterHandle}
      />
      <InputField
        defaultValue={student.githubUrl || undefined}
        error={errors.githubUrl}
        label="GitHub URL"
        name={githubUrl}
      />
      <InputField
        defaultValue={student.calendlyUrl || undefined}
        error={errors.calendlyUrl}
        label="Calendly URL"
        name={calendlyUrl}
      />
      <InputField
        defaultValue={student.personalWebsiteUrl || undefined}
        error={errors.personalWebsiteUrl}
        label="Personal Website"
        name={personalWebsiteUrl}
      />

      <Button.Group spacing="between">
        <JoinDirectoryBackButton to={Route['/directory/join/2']} />
        <JoinDirectoryNextButton>Next</JoinDirectoryNextButton>
      </Button.Group>
    </RemixForm>
  );
}
