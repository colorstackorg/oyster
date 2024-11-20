import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { generatePath, useLoaderData, useSearchParams } from '@remix-run/react';
import dayjs from 'dayjs';

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

  const offer = await getFullTimeOfferDetails({
    memberId: user(session),
    offerId: params.id as string,
  });

  if (!offer) {
    throw new Response(null, {
      status: 404,
      statusText: 'The full-time offer you are looking for does not exist.',
    });
  }

  return json(offer);
}

type GetFullTimeOfferDetailsInput = {
  memberId: string;
  offerId: string;
};

async function getFullTimeOfferDetails({
  memberId,
  offerId,
}: GetFullTimeOfferDetailsInput) {
  const _offer = await db
    .selectFrom('fullTimeJobOffers as fullTimeOffers')
    .leftJoin('companies', 'companies.id', 'fullTimeOffers.companyId')
    .select([
      'companies.id as companyId',
      'companies.name as companyName',
      'companies.imageUrl as companyLogo',
      'fullTimeOffers.additionalNotes',
      'fullTimeOffers.baseSalary',
      'fullTimeOffers.benefits',
      'fullTimeOffers.id',
      'fullTimeOffers.location',
      'fullTimeOffers.negotiated',
      'fullTimeOffers.pastExperience',
      'fullTimeOffers.performanceBonus',
      'fullTimeOffers.postedAt',
      'fullTimeOffers.relocation',
      'fullTimeOffers.role',
      'fullTimeOffers.signOnBonus',
      'fullTimeOffers.slackChannelId',
      'fullTimeOffers.slackMessageId',
      'fullTimeOffers.totalCompensation',
      'fullTimeOffers.totalStock',

      (eb) => {
        return eb
          .or([
            eb('fullTimeOffers.postedBy', '=', memberId),
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
    .where('fullTimeOffers.id', '=', offerId)
    .executeTakeFirst();

  if (!_offer) {
    return null;
  }

  const formatter = new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  });

  const offer = {
    ..._offer,
    annualStock: formatter.format((Number(_offer.totalStock) || 0) / 4),
    baseSalary: formatter.format(Number(_offer.baseSalary)),
    performanceBonus: formatter.format(Number(_offer.performanceBonus) || 0),
    postedAt: dayjs().to(_offer.postedAt),
    signOnBonus: formatter.format(Number(_offer.signOnBonus) || 0),
    totalCompensation: formatter.format(Number(_offer.totalCompensation)),
    totalStock: formatter.format(Number(_offer.totalStock)),
  };

  return offer;
}

export default function FullTimeOfferPage() {
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
        pathname: Route['/offers/full-time'],
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
            pathname={generatePath(Route['/offers/full-time/:id/edit'], {
              id,
            })}
          />
          <Modal.CloseButton />
        </div>
      </Modal.Header>

      <FullTimeOfferDetails />

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

function FullTimeOfferDetails() {
  const {
    additionalNotes,
    annualStock,
    baseSalary,
    benefits,
    location,
    negotiated,
    pastExperience,
    performanceBonus,
    relocation,
    signOnBonus,
    totalCompensation,
    totalStock,
  } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-4 sm:p-4">
      <OfferSection>
        <OfferDetail label="Employment Type" value="Full-Time" />
        <OfferDetail label="Location" value={location} />
      </OfferSection>

      <Divider />

      <OfferSection>
        <OfferDetail label="Total Compensation" value={totalCompensation} />
        <OfferDetail label="Base Salary" value={baseSalary} />
        <OfferDetail label="Total Stock" value={totalStock} />
        <OfferDetail label="Stock (/yr)" value={annualStock} />
        <OfferDetail label="Performance Bonus (/yr)" value={performanceBonus} />
        <OfferDetail label="Sign-On Bonus (One-Time)" value={signOnBonus} />
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
