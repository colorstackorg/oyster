import { type LoaderFunctionArgs } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { Info, Send } from 'react-feather';
import { match } from 'ts-pattern';

import { ApplicationRejectionReason } from '@oyster/core/applications/types';
import { listReferrals } from '@oyster/core/referrals';
import { type ReferralStatus } from '@oyster/core/referrals/ui';
import { Button, Pill, Text } from '@oyster/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';

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

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const _referrals = await listReferrals({
    select: [
      'applications.rejectionReason',
      'referrals.email',
      'referrals.firstName',
      'referrals.id',
      'referrals.lastName',
      'referrals.status',
    ],
    where: { referrerId: user(session) },
  });

  const referrals = _referrals.map((referral) => {
    return {
      ...referral,
      rejectionReason: formatRejectionReason(referral.rejectionReason),
    };
  });

  return {
    referrals,
  };
}

/**
 * Formats a rejection reason into a user-friendly message.
 *
 * @param reason - The raw rejection reason.
 * @returns A formatted, user-friendly explanation of the rejection reason.
 *
 * @example
 * // Returns "Your referral was rejected because they are not the right major."
 * formatRejectionReason('ineligible_major');
 **/
function formatRejectionReason(reason: string | null): string | undefined {
  const prefix = 'Your referral was rejected because ';

  switch (reason) {
    case ApplicationRejectionReason.BAD_LINKEDIN:
      return prefix + 'their LinkedIn was incomplete/incorrect.';

    case ApplicationRejectionReason.EMAIL_BOUNCED:
      return prefix + 'their email bounced.';

    case ApplicationRejectionReason.IS_INTERNATIONAL:
      return prefix + 'they are not enrolled in the US or Canada.';

    case ApplicationRejectionReason.INELIGIBLE_MAJOR:
      return prefix + 'they are not the right major.';

    case ApplicationRejectionReason.NOT_UNDERGRADUATE:
      return prefix + 'they are not an undergraduate student.';

    default:
      return undefined;
  }
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
              <Button.Slot>
                <Link to={Route['/profile/referrals/add']}>
                  <Send size={20} /> Refer a Friend
                </Link>
              </Button.Slot>
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
                      return <RejectedPill reason={referral.rejectionReason} />;
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

            <Button.Slot fill>
              <Link to={Route['/profile/referrals/add']}>Refer a Friend</Link>
            </Button.Slot>
          </EmptyStateContainer>
        )}
      </ProfileSection>

      <Outlet />
    </>
  );
}

type RejectedPillProps = {
  reason?: string;
};

function RejectedPill({ reason }: RejectedPillProps) {
  if (!reason) {
    return <Pill color="red-100">Rejected</Pill>;
  }

  return (
    <Tooltip>
      <TooltipTrigger cursor="default">
        <Pill className="flex items-center gap-1" color="red-100">
          Rejected
          {!!reason && <Info size={16} className="text-error" />}
        </Pill>
      </TooltipTrigger>

      <TooltipContent>
        <TooltipText>{reason}</TooltipText>
      </TooltipContent>
    </Tooltip>
  );
}
