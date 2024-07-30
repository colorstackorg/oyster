import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { Send } from 'react-feather';
import { match } from 'ts-pattern';

import { listReferrals } from '@oyster/core/referrals';
import { type ReferralStatus } from '@oyster/core/referrals.ui';
import { Button, getButtonCn, Pill, Text } from '@oyster/ui';

import {
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '@/shared/components/profile';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const referrals = await listReferrals({
    select: [
      'referrals.email',
      'referrals.firstName',
      'referrals.id',
      'referrals.lastName',

      'referrals.status',
    ],
    where: { referrerId: user(session) },
  });

  return json({
    referrals,
  });
}

export default function Referrals() {
  const { referrals } = useLoaderData<typeof loader>();

  return (
    <>
      <ProfileSection>
        <ProfileHeader>
          <ProfileTitle>Referrals</ProfileTitle>

          <Button.Group>
            <Link
              className={getButtonCn({ color: 'primary', size: 'small' })}
              to={Route['/profile/referrals/add']}
            >
              <Send size={20} /> Refer a Friend
            </Link>
          </Button.Group>
        </ProfileHeader>

        {!!referrals.length && (
          <ul>
            {referrals.map((referral) => {
              return (
                <li
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-2"
                  key={referral.id}
                >
                  <div>
                    <Text>
                      {referral.firstName} {referral.lastName}
                    </Text>

                    <Text color="gray-500" variant="sm">
                      {referral.email}
                    </Text>
                  </div>

                  {match(referral.status as ReferralStatus)
                    .with('accepted', () => {
                      return <Pill color="lime-100">Accepted</Pill>;
                    })
                    .with('applied', () => {
                      return <Pill color="orange-100">Applied</Pill>;
                    })
                    .with('rejected', () => {
                      return <Pill color="red-100">Rejected</Pill>;
                    })
                    .with('sent', () => {
                      return <Pill color="amber-100">Sent</Pill>;
                    })
                    .exhaustive()}
                </li>
              );
            })}
          </ul>
        )}
      </ProfileSection>

      <Outlet />
    </>
  );
}
