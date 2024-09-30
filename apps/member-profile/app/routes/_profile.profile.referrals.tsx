import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { Info, Send } from 'react-feather';
import { match } from 'ts-pattern';

import { listReferrals } from '@oyster/core/referrals';
import { type ReferralStatus } from '@oyster/core/referrals/ui';
import { Button, getButtonCn, Pill, Text } from '@oyster/ui';
import { formatRejectionReason } from '@/shared/utils/format.utils';

import {
  EmptyState,
  EmptyStateContainer,
} from '@/shared/components/empty-state';
import {
  ProfileDescription,
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '@/shared/components/profile';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';
import { ReferralAcceptedEmail } from '@oyster/email-templates';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const referrals = await listReferrals({
    select: [
      'referrals.email',
      'referrals.firstName',
      'referrals.id',
      'referrals.lastName',
      'referrals.status',
      'applications.rejectionReason',
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

          {!!referrals.length && (
            <Button.Group>
              <Link
                className={getButtonCn({ size: 'small' })}
                to={Route['/profile/referrals/add']}
              >
                <Send size={20} /> Refer a Friend
              </Link>
            </Button.Group>
          )}
        </ProfileHeader>

        {referrals.length ? (
          <ul className="flex flex-col gap-2">
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
                      return referral.rejectionReason ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex">
                              <Pill color="red-100">
                                <div className="group flex items-center gap-1">
                                  Rejected
                                  <Info
                                    size={16}
                                    className="text-red-500 transition-colors duration-300 group-hover:text-gray-600"
                                  />
                                </div>
                              </Pill>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <TooltipText>
                              {formatRejectionReason(referral.rejectionReason)}
                            </TooltipText>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Pill color="red-100">Rejected</Pill>
                      );
                    })
                    .with('sent', () => {
                      return <Pill color="amber-100">Sent</Pill>;
                    })
                    .exhaustive()}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyStateContainer>
            <EmptyState icon={<Send />} />

            <ProfileDescription>
              You can refer your friends to join ColorStack! When they apply
              using your referral, they'll have a better chance of getting
              accepted. You'll also earn points for each successful referral!
            </ProfileDescription>

            <Link
              className={getButtonCn({ fill: true, size: 'small' })}
              to={Route['/profile/referrals/add']}
            >
              Refer a Friend
            </Link>
          </EmptyStateContainer>
        )}
      </ProfileSection>

      <Outlet />
    </>
  );
}
