import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useSearchParams } from '@remix-run/react';
import dayjs from 'dayjs';
import { type PropsWithChildren } from 'react';

import { hourlyToMonthlyRate } from '@oyster/core/job-offers';
import { db } from '@oyster/db';
import { Divider, Modal, Text } from '@oyster/ui';

import { CompanyLink } from '@/shared/components';
import { ViewInSlackButton } from '@/shared/components/slack-message';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const offer = await getInternshipOfferDetails({
    memberId: user(session),
    offerId: params.id as string,
  });

  if (!offer) {
    throw new Response(null, {
      status: 404,
      statusText: 'The internship offer you are looking for does not exist.',
    });
  }

  return json(offer);
}

type GetInternshipOfferDetailsInput = {
  memberId: string;
  offerId: string;
};

async function getInternshipOfferDetails({
  memberId,
  offerId,
}: GetInternshipOfferDetailsInput) {
  const _offer = await db
    .selectFrom('internshipJobOffers as internshipOffers')
    .leftJoin('companies', 'companies.id', 'internshipOffers.companyId')
    .select([
      'companies.id as companyId',
      'companies.imageUrl as companyLogo',
      'companies.name as companyName',
      'internshipOffers.additionalNotes',
      'internshipOffers.benefits',
      'internshipOffers.id',
      'internshipOffers.hourlyRate',
      'internshipOffers.location',
      'internshipOffers.negotiated',
      'internshipOffers.pastExperience',
      'internshipOffers.postedAt',
      'internshipOffers.relocation',
      'internshipOffers.role',
      'internshipOffers.signOnBonus',
      'internshipOffers.slackChannelId',
      'internshipOffers.slackMessageId',

      (eb) => {
        return eb
          .or([
            eb('internshipOffers.postedBy', '=', memberId),
            eb.exists(() => {
              return eb
                .selectFrom('admins')
                .where('admins.memberId', '=', memberId)
                .where('admins.deletedAt', 'is', null);
            }),
          ])
          .as('hasWritePermission');
      },
    ])
    .where('internshipOffers.id', '=', offerId)
    .executeTakeFirst();

  if (!_offer) {
    return null;
  }

  const formatter = new Intl.NumberFormat('en-US', {
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: 'currency',
  });

  const hourlyRate = parseInt(_offer.hourlyRate);
  const monthlyRate = hourlyToMonthlyRate(hourlyRate);

  const offer = {
    ..._offer,
    hourlyRate: formatter.format(hourlyRate) + '/hr',
    monthlyRate: formatter.format(monthlyRate) + '/mo',
    postedAt: dayjs().to(_offer.postedAt),
    signOnBonus: formatter.format(Number(_offer.signOnBonus) || 0),
  };

  return offer;
}

// UI

export default function InternshipOfferPage() {
  const {
    companyId,
    companyLogo,
    companyName,
    slackChannelId,
    slackMessageId,
  } = useLoaderData<typeof loader>();

  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/offers/internships'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <div className="flex flex-col gap-2">
          <CompanyLink
            companyId={companyId}
            companyLogo={companyLogo}
            companyName={companyName}
          />
          <InternshipOfferTitle />
        </div>

        <div className="flex items-center gap-[inherit]">
          <Modal.CloseButton />
        </div>
      </Modal.Header>

      <InternshipOfferDetails />

      {slackChannelId && slackMessageId && (
        <div className="mx-auto">
          <ViewInSlackButton
            channelId={slackChannelId}
            messageId={slackMessageId}
          />
        </div>
      )}
    </Modal>
  );
}

function InternshipOfferTitle() {
  const { postedAt, role } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-1">
      <Text variant="lg">{role}</Text>
      <Text color="gray-500" variant="sm">
        Posted {postedAt} ago
      </Text>
    </div>
  );
}

function InternshipOfferDetails() {
  const {
    additionalNotes,
    benefits,
    hourlyRate,
    location,
    monthlyRate,
    negotiated,
    pastExperience,
    relocation,
    signOnBonus,
  } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-4 sm:p-4">
      <OfferSection>
        <OfferDetailItem label="Employment Type" value="Internship" />
        <OfferDetailItem label="Location" value={location} />
      </OfferSection>

      <Divider />

      <OfferSection>
        <OfferDetailItem label="Hourly Rate" value={hourlyRate} />
        <OfferDetailItem label="Monthly Rate" value={monthlyRate} />
        <OfferDetailItem label="Sign-On Bonus" value={signOnBonus} />
        <OfferDetailItem label="Relocation" value={relocation} />
      </OfferSection>

      <Divider />

      <OfferSection>
        <OfferDetailItem label="Benefits" value={benefits} />
        <OfferDetailItem label="Past Experience" value={pastExperience} />
        <OfferDetailItem label="Negotiated" value={negotiated} />
        <OfferDetailItem label="Additional Notes" value={additionalNotes} />
      </OfferSection>
    </div>
  );
}

// TODO: Move to shared component for full-time offer usage as well.

function OfferSection({ children }: PropsWithChildren) {
  return <section className="grid gap-4 sm:grid-cols-2">{children}</section>;
}

type OfferDetailItemProps = {
  label: string;
  value: string | number | null | undefined;
};

function OfferDetailItem({ label, value }: OfferDetailItemProps) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <Text color="gray-500" variant="sm">
        {label}
      </Text>

      <Text>{value}</Text>
    </div>
  );
}
