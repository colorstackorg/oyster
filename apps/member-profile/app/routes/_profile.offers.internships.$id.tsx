import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { generatePath, useLoaderData, useSearchParams } from '@remix-run/react';
import dayjs from 'dayjs';

import { hourlyToMonthlyRate } from '@oyster/core/job-offers';
import { db } from '@oyster/db';
import { Divider, Modal } from '@oyster/ui';

import { CompanyLink } from '@/shared/components';
import {
  EditOfferButton,
  OfferDetail,
  OfferSection,
  OfferTitle,
} from '@/shared/components/offer';
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

  const hourlyRate = Number(_offer.hourlyRate);
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
    hasWritePermission,
    id,
    postedAt,
    role,
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
          <OfferTitle postedAt={postedAt} role={role!} />
        </div>

        <div className="flex items-center gap-[inherit]">
          <EditOfferButton
            hasWritePermission={!!hasWritePermission}
            pathname={generatePath(Route['/offers/internships/:id/edit'], {
              id,
            })}
          />
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
        <OfferDetail label="Employment Type" value="Internship" />
        <OfferDetail label="Location" value={location} />
      </OfferSection>

      <Divider />

      <OfferSection>
        <OfferDetail label="Hourly Rate" value={hourlyRate} />
        <OfferDetail label="Monthly Rate" value={monthlyRate} />
        <OfferDetail label="Sign-On Bonus" value={signOnBonus} />
        <OfferDetail label="Relocation" value={relocation} />
        <OfferDetail label="Benefits" value={benefits} />
      </OfferSection>

      <Divider />

      <OfferSection>
        <OfferDetail label="Past Experience" value={pastExperience} />
        <OfferDetail label="Negotiated" value={negotiated} />
        <OfferDetail label="Additional Notes" value={additionalNotes} />
      </OfferSection>
    </div>
  );
}
