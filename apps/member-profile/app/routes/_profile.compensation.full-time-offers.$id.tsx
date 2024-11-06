import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  generatePath,
  Link,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { emojify } from 'node-emoji';
import { Edit } from 'react-feather';

import { getFullTimeJobOfferDetails } from '@oyster/core/member-profile/server';
import { getIconButtonCn, Modal, Text } from '@oyster/ui';

import { SlackMessageLink } from '@/shared/components/slack-message';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);
  const memberId = user(session);
  const offerId = params.id as string;

  const offer = await getFullTimeJobOfferDetails({
    memberId,
    offerId,
  });

  if (!offer) {
    throw new Response(null, {
      status: 404,
      statusText: 'The full-time offer you are looking for does not exist.',
    });
  }

  Object.assign(offer, {
    createdAt: dayjs().to(offer.createdAt),
    slackMessageText: emojify(offer.slackMessageText || '', {
      fallback: '',
    }),
    slackMessagePostedAt: dayjs().to(offer.slackMessagePostedAt),
  });

  return json(offer);
}

export default function FullTimeOfferPage() {
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/compensation/full-time-offers'],
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
          pathname: generatePath(
            Route['/compensation/full-time-offers/:id/edit'],
            {
              id,
            }
          ),
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
  const {
    id,
    slackMessageChannelId,
    posterFirstName,
    posterLastName,
    posterProfilePicture,
  } = useLoaderData<typeof loader>();

  if (!slackMessageChannelId) return null;

  return (
    <SlackMessageLink
      channelId={slackMessageChannelId}
      messageId={id}
      posterFirstName={posterFirstName || ''}
      posterLastName={posterLastName || ''}
      posterProfilePicture={posterProfilePicture || ''}
    />
  );
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
            value={
              offer.totalCompensation
                ? `$${offer.totalCompensation.toLocaleString()}`
                : ''
            }
          />
          <DetailItem
            label="Base Salary"
            value={
              offer.baseSalary ? `$${offer.baseSalary.toLocaleString()}` : ''
            }
          />
          <DetailItem
            label="Hourly Rate"
            value={offer.hourlyRate ? `$${offer.hourlyRate}/hr` : ''}
          />
          <DetailItem
            label="Stock Per Year"
            value={
              offer.stockPerYear
                ? `$${offer.stockPerYear.toLocaleString()}`
                : ''
            }
          />
        </div>
      </section>

      <div className="h-[1px] bg-gray-200" />

      {/* Bonuses and Benefits */}
      <section>
        <div className="grid grid-cols-2 gap-3">
          <DetailItem
            label="Total Bonus"
            value={offer.bonus ? `$${offer.bonus.toLocaleString()}` : ''}
          />
          <DetailItem
            label="Performance Bonus"
            value={offer.performanceBonusText}
          />
          <DetailItem label="Sign-on Bonus" value={offer.signOnBonusText} />
          <DetailItem label="Relocation" value={offer.relocationText} />
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
                label="Years of Experience"
                value={offer.yearsOfExperience}
              />
              <DetailItem label="Negotiated" value={offer.negotiatedText} />
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
