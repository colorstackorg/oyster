import { ActionFunctionArgs, LoaderFunctionArgs, json } from '@remix-run/node';
import {
  Outlet,
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
} from '@remix-run/react';
import { Edit, Plus } from 'react-feather';
import { z } from 'zod';

import { Button, Text, cx, getActionErrors, validateForm } from '@oyster/ui';

import {
  ProfileDescription,
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '../shared/components/profile';

import { AllowEmailShareField } from '../shared/components/profile.personal';

import { Route } from '../shared/constants';
import { db } from '../shared/core.server';
import { track } from '../shared/mixpanel.server';
import {
  getMember,
  listEmails,
  updateAllowEmailShare,
} from '../shared/queries';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = user(session);

  const emails = await listEmails(id);

  const student = await getMember(id)
    .select('allowEmailShare')
    .executeTakeFirstOrThrow();

  track(request, 'Page Viewed', {
    Page: 'Profile - Email Addresses',
  });

  return json({
    emails,
    student,
  });
}

const UpdateAllowEmailShare = z.object({
  AllowEmailShare: z.preprocess((value) => value === '1', z.boolean()),
});

type UpdateAllowEmailShare = z.infer<typeof UpdateAllowEmailShare>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    UpdateAllowEmailShare,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  await db.transaction().execute(async (trx) => {
    await updateAllowEmailShare(trx, user(session), data.AllowEmailShare);
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

const { AllowEmailShare } = UpdateAllowEmailShare.keyof().enum;

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
  const { errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

  const navigate = useNavigate();

  function onAddEmail() {
    navigate(Route.ADD_EMAIL_START);
  }

  function onChangePrimaryEmail() {
    navigate(Route.CHANGE_PRIMARY_EMAIL);
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
      <RemixForm className="form" method="post">
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
                  <Text
                    className="font-medium uppercase text-gold"
                    variant="sm"
                  >
                    Primary
                  </Text>
                )}
              </li>
            );
          })}
        </ul>
        <AllowEmailShareField
          defaultValue={student.allowEmailShare}
          error={errors.AllowEmailShare}
          name={AllowEmailShare}
        />
        <Button.Group>
          <Button onClick={onAddEmail} size="small" variant="secondary">
            <Plus /> Add Email
          </Button>

          {emails.length > 1 && (
            <Button color="primary" onClick={onChangePrimaryEmail} size="small">
              <Edit /> Change Primary
            </Button>
          )}
        </Button.Group>
        <Button.Group>
          <Button loading={submitting} type="submit">
            Save
          </Button>
        </Button.Group>
      </RemixForm>
    </ProfileSection>
  );
}
