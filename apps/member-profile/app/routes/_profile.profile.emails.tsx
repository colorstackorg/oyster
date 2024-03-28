import { json, LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLoaderData, useNavigate } from '@remix-run/react';
import { Edit, Plus } from 'react-feather';

import { Button, cx, Text } from '@oyster/core-ui';

import {
  ProfileDescription,
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '../shared/components/profile';
import { Route } from '../shared/constants';
import { track } from '../shared/mixpanel.server';
import { listEmails } from '../shared/queries';
import { ensureUserAuthenticated, user } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = user(session);

  const emails = await listEmails(id);

  track(request, 'Page Viewed', {
    Page: 'Profile - Email Addresses',
  });

  return json({
    emails,
  });
}

export default function EmailsPage() {
  return (
    <>
      <EmailAddressSection />
      <Outlet />
    </>
  );
}

function EmailAddressSection() {
  const { emails } = useLoaderData<typeof loader>();

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

      <ul className="flex flex-col gap-2">
        {emails.map((email) => {
          return (
            <li
              className={cx(
                'flex items-center justify-between rounded-lg border border-solid p-2',

                email.primary
                  ? 'border-[var(--color-gold)] bg-[var(--color-gold-100)]'
                  : 'border-gray-200'
              )}
              key={email.email}
            >
              <Text>{email.email}</Text>

              {email.primary && (
                <Text
                  className="font-medium uppercase text-[var(--color-gold)]"
                  variant="sm"
                >
                  Primary
                </Text>
              )}
            </li>
          );
        })}
      </ul>

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
    </ProfileSection>
  );
}
