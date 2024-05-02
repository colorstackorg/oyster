import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import {
  Link,
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';
import { z } from 'zod';

import { nullableField, Student } from '@oyster/types';
import {
  Button,
  getActionErrors,
  InputField,
  Text,
  validateForm,
} from '@oyster/ui';

import {
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '../shared/components/profile';
import { Route } from '../shared/constants';
import { updateMember } from '../shared/core.server';
import { getMember } from '../shared/queries';
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

const keys = UpdateSocialsInformation.keyof().enum;

export default function UpdateSocialsInformationForm() {
  const { student } = useLoaderData<typeof loader>();
  const { errors } = getActionErrors(useActionData<typeof action>());

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

        <div className="flex flex-col gap-2">
          <InputField
            defaultValue={student.githubUrl || undefined}
            disabled
            label="GitHub URL"
            name="_"
          />
          <Text color="gray-500" variant="sm">
            You can connect your GitHub account on the{' '}
            <Link className="link" to={Route['/profile/integrations']}>
              Integrations
            </Link>{' '}
            page.
          </Text>
        </div>

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

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </RemixForm>
    </ProfileSection>
  );
}
