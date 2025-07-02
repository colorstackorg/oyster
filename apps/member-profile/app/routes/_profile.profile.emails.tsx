import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import {
  Form,
  Outlet,
  useActionData,
  useLoaderData,
  useNavigate,
  useSubmit,
} from '@remix-run/react';
import { Edit, Plus } from 'react-feather';
import { z } from 'zod';

import {
  listEmails,
  updateAllowEmailShare,
} from '@oyster/core/member-profile/server';
import { buildMeta } from '@oyster/core/remix';
import {
  Button,
  Checkbox,
  cx,
  Field,
  getErrors,
  Text,
  validateForm,
} from '@oyster/ui';

import {
  ProfileDescription,
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '@/shared/components/profile';
import { Route } from '@/shared/constants';
import { getMember } from '@/shared/queries';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export const meta: MetaFunction = () => {
  return buildMeta({
    description: 'Manage your email addresses and email sharing settings.',
    title: 'Email Addresses',
  });
};

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = user(session);

  const [emails, student] = await Promise.all([
    listEmails(id),
    getMember(id).select('allowEmailShare').executeTakeFirstOrThrow(),
  ]);

  return json({
    emails,
    student,
  });
}

const UpdateAllowEmailShare = z.object({
  allowEmailShare: z.preprocess((value) => value === '1', z.boolean()),
});

type UpdateAllowEmailShare = z.infer<typeof UpdateAllowEmailShare>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, UpdateAllowEmailShare);

  if (!result.ok) {
    return json(result, { status: 400 });
  }

  await updateAllowEmailShare(user(session), result.data.allowEmailShare);

  toast(session, {
    message: 'Updated!',
  });

  return json(
    { error: '' },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

const keys = UpdateAllowEmailShare.keyof().enum;

export default function EmailsPage() {
  return (
    <>
      <EmailAddressSection />
      <Outlet />
    </>
  );
}

function EmailAddressSection() {
  const { emails, student } = useLoaderData<typeof loader>();
  const { errors } = getErrors(useActionData<typeof action>());

  const submit = useSubmit();

  const navigate = useNavigate();

  function onAddEmail() {
    navigate(Route['/profile/emails/add/start']);
  }

  function onChangePrimaryEmail() {
    navigate(Route['/profile/emails/change-primary']);
  }

  return (
    <ProfileSection>
      <ProfileHeader>
        <ProfileTitle>Email Addresses</ProfileTitle>
      </ProfileHeader>

      <ProfileDescription>
        If you engage with ColorStack using multiple email addresses (ie:
        school, personal, work), please add them here. Your primary email is the
        email where you will receive all ColorStack communications.
      </ProfileDescription>

      <ul className="flex flex-col gap-2">
        {emails.map((email) => {
          return (
            <li
              className={cx(
                'flex items-center justify-between rounded-lg border border-solid p-2',
                email.primary ? 'border-gold bg-gold-100' : 'border-gray-200'
              )}
              key={email.email}
            >
              <Text>{email.email}</Text>

              {email.primary && (
                <Text className="font-medium uppercase text-gold" variant="sm">
                  Primary
                </Text>
              )}
            </li>
          );
        })}
      </ul>

      <Button.Group>
        <Button onClick={onAddEmail} variant="secondary">
          <Plus /> Add Email
        </Button>

        {emails.length > 1 && (
          <Button color="primary" onClick={onChangePrimaryEmail}>
            <Edit /> Change Primary
          </Button>
        )}
      </Button.Group>

      <Form
        className="form"
        method="post"
        onChange={(e) => submit(e.currentTarget)}
      >
        <Field
          description="If you go to school where there is a ColorStack chapter, this will allow that chapter's leaders to reach out to you about local events and opportunities."
          error={errors.allowEmailShare}
          label="Would you like to share your email with chapter leaders?"
        >
          <Checkbox
            defaultChecked={student.allowEmailShare}
            label="Share my email with chapter leaders! 🌟"
            id={keys.allowEmailShare}
            name={keys.allowEmailShare}
            value="1"
          />
        </Field>
      </Form>
    </ProfileSection>
  );
}
