import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  generatePath,
  Link,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { Edit } from 'react-feather';

import { db } from '@oyster/db';
import { getIconButtonCn, Modal, Text } from '@oyster/ui';

import { ViewInSlackButton } from '@/shared/components/slack-message';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);
  const memberId = user(session);
  const offerId = params.id as string;

  const _offer = await getFullTimeJobOfferDetails({
    memberId,
    offerId,
  });

  if (!_offer) {
    throw new Response(null, {
      status: 404,
      statusText: 'The full-time offer you are looking for does not exist.',
    });
  }

  Object.assign(_offer, {
    createdAt: dayjs().to(_offer.createdAt),
  });

  const formatter = new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  });

  const offer = {
    ..._offer,
    annualizedStock: formatter.format(Number(_offer.totalStock) / 4),
    baseSalary: formatter.format(Number(_offer.baseSalary)),
    performanceBonus:
      _offer.performanceBonus !== null
        ? formatter.format(Number(_offer.performanceBonus))
        : 'N/A',
    signOnBonus:
      _offer.signOnBonus !== null
        ? formatter.format(Number(_offer.signOnBonus))
        : 'N/A',
    totalCompensation: formatter.format(Number(_offer.totalCompensation)),
    totalStock: formatter.format(Number(_offer.totalStock)),
  };

  return json(offer);
}

type GetFullTimeJobOfferDetailsInput = {
  memberId: string;
  offerId: string;
};

async function getFullTimeJobOfferDetails({
  memberId,
  offerId,
}: GetFullTimeJobOfferDetailsInput) {
  const offer = await db
    .selectFrom('fullTimeJobOffers')
    .leftJoin('companies', 'companies.id', 'fullTimeJobOffers.companyId')
    .leftJoin('students', 'students.id', 'fullTimeJobOffers.postedBy')
    .leftJoin('slackMessages', (join) => {
      return join
        .onRef(
          'slackMessages.channelId',
          '=',
          'fullTimeJobOffers.slackChannelId'
        )
        .onRef('slackMessages.id', '=', 'fullTimeJobOffers.slackMessageId');
    })
    .select([
      'companies.id as companyId',
      'companies.name as companyName',
      'companies.imageUrl as companyLogo',
      'companies.crunchbaseId as companyCrunchbaseId',
      'fullTimeJobOffers.id',
      'fullTimeJobOffers.role',
      'fullTimeJobOffers.location',
      'fullTimeJobOffers.createdAt',
      'fullTimeJobOffers.totalCompensation',
      'fullTimeJobOffers.baseSalary',
      'fullTimeJobOffers.signOnBonus',
      'fullTimeJobOffers.performanceBonus',
      'fullTimeJobOffers.relocation',
      'fullTimeJobOffers.benefits',
      'fullTimeJobOffers.totalStock',
      'fullTimeJobOffers.pastExperience',
      'fullTimeJobOffers.negotiated',
      'fullTimeJobOffers.additionalNotes',
      'slackMessages.channelId as slackMessageChannelId',
      'slackMessages.createdAt as slackMessagePostedAt',
      'slackMessages.id as slackMessageId',
      'slackMessages.text as slackMessageText',
      'students.firstName as posterFirstName',
      'students.lastName as posterLastName',
      'students.profilePicture as posterProfilePicture',

      (eb) => {
        return eb
          .or([
            eb('fullTimeJobOffers.postedBy', '=', memberId),
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
    .where('fullTimeJobOffers.id', '=', offerId)
    .executeTakeFirst();

  return offer;
}

export default function FullTimeOfferPage() {
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
          <CompanyLink />
          <OfferTitle />
        </div>
        <div className="flex items-center gap-[inherit]">
          {/* <EditOfferButton /> */}
          <Modal.CloseButton />
        </div>
      </Modal.Header>

      <OfferDetails />
      <SlackMessage />
    </Modal>
  );
}

function CompanyLink() {
  const { companyId, companyLogo, companyName } =
    useLoaderData<typeof loader>();

  if (!companyId || !companyName) {
    return null;
  }

  return (
    <Link
      className="flex w-fit items-center gap-2 hover:underline"
      target="_blank"
      to={generatePath(Route['/companies/:id'], { id: companyId })}
    >
      <div className="h-8 w-8 rounded-lg border border-gray-200 p-1">
        <img
          alt={companyName}
          className="aspect-square h-full w-full rounded-md"
          src={companyLogo as string}
        />
      </div>

      <Text variant="sm">{companyName}</Text>
    </Link>
  );
}

function OfferTitle() {
  const { createdAt, role } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-1">
      <Text variant="lg">{role}</Text>
      <Text color="gray-500" variant="sm">
        Posted {createdAt} ago
      </Text>
    </div>
  );
}

function EditOfferButton() {
  const { hasWritePermission, id } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  if (!hasWritePermission) {
    return null;
  }

  return (
    <>
      <Link
        className={getIconButtonCn({
          backgroundColor: 'gray-100',
          backgroundColorOnHover: 'gray-200',
        })}
        to={{
          pathname: generatePath(Route['/offers/full-time/:id/edit'], {
            id,
          }),
          search: searchParams.toString(),
        }}
      >
        <Edit />
      </Link>

      <div className="h-6 w-[1px] bg-gray-100" />
    </>
  );
}

function SlackMessage() {
  const { id, slackMessageChannelId } = useLoaderData<typeof loader>();

  if (!slackMessageChannelId) {
    return null;
  }

  return <ViewInSlackButton channelId={slackMessageChannelId} messageId={id} />;
}

function OfferDetails() {
  const offer = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Basic Information */}
      <section>
        <div className="grid grid-cols-2 gap-3">
          <DetailItem label="Employment Type" value="Full-Time" />
          <DetailItem label="Location" value={offer.location} />
        </div>
      </section>

      <div className="h-[1px] bg-gray-200" />

      {/* Compensation Details */}
      <section>
        <div className="grid grid-cols-2 gap-3">
          <DetailItem
            label="Total Compensation"
            value={offer.totalCompensation}
          />
          <DetailItem label="Base Salary" value={offer.baseSalary} />
          <DetailItem label="Total Stock" value={offer.totalStock} />
          <DetailItem label="Stock (/yr)" value={offer.annualizedStock} />
        </div>
      </section>

      <div className="h-[1px] bg-gray-200" />

      {/* Bonuses and Benefits */}
      <section>
        <div className="grid grid-cols-2 gap-3">
          <DetailItem
            label="Performance Bonus"
            value={offer.performanceBonus}
          />
          <DetailItem label="Sign-On Bonus" value={offer.signOnBonus} />
          <DetailItem label="Relocation" value={offer.relocation} />
        </div>
      </section>

      {/* Additional Notes */}
      {offer.additionalNotes && (
        <>
          <div className="h-[1px] bg-gray-200" />
          <section>
            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Benefits" value={offer.benefits} />
              <DetailItem
                label="Past Experience"
                value={offer.pastExperience}
              />
              <DetailItem label="Negotiated" value={offer.negotiated} />
              <DetailItem
                label="Additional Notes"
                value={offer.additionalNotes}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (!value) return null;

  return (
    <div>
      <Text color="gray-500" variant="sm">
        {label}
      </Text>
      <Text>{value}</Text>
    </div>
  );
}
