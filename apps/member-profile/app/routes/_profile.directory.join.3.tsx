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
import { z } from 'zod';

import {
  Button,
  getActionErrors,
  InputField,
  validateForm,
} from '@oyster/core-ui';
import { nullableField, Student } from '@oyster/types';

import { Route } from '../shared/constants';
import { db } from '../shared/core.server';
import { getMember, updateSocialsInformation } from '../shared/queries';
import { ensureUserAuthenticated, user } from '../shared/session.server';
import { formatUrl } from '../shared/url.utils';
import {
  JoinDirectoryBackButton,
  JoinDirectoryNextButton,
} from './_profile.directory.join';

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

  await db.transaction().execute(async (trx) => {
    await updateSocialsInformation(trx, user(session), data);
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

  const submitting = useNavigation().state === 'submitting';

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
        <JoinDirectoryNextButton submitting={submitting}>
          Next
        </JoinDirectoryNextButton>
      </Button.Group>
    </RemixForm>
  );
}
