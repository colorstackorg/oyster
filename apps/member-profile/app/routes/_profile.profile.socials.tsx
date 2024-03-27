import { ActionFunctionArgs, json, LoaderFunctionArgs } from '@remix-run/node';
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
} from '@colorstack/core-ui';
import { nullableField, Student } from '@colorstack/types';

import {
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '../shared/components/profile';
import { db } from '../shared/core.server';
import { getMember, updateSocialsInformation } from '../shared/queries';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '../shared/session.server';
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

  await db.transaction().execute(async (trx) => {
    await updateSocialsInformation(trx, user(session), data);
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
    <ProfileSection>
      <ProfileHeader>
        <ProfileTitle>Socials</ProfileTitle>
      </ProfileHeader>

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

        <Button.Group>
          <Button loading={submitting} type="submit">
            Save
          </Button>
        </Button.Group>
      </RemixForm>
    </ProfileSection>
  );
}
