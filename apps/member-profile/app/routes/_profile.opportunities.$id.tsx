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

import { job } from '@oyster/core/bull';
import { track } from '@oyster/core/mixpanel';
import { getOpportunityDetails } from '@oyster/core/opportunities';
import { getIconButtonCn, Modal, Pill, Text } from '@oyster/ui';
import { run } from '@oyster/utils';

import {
  BookmarkButton,
  BookmarkForm,
} from '@/routes/_profile.opportunities.$id_.bookmark';
import { CompanyLink } from '@/shared/components';
import { SlackMessageCard } from '@/shared/components/slack-message';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);
  const opportunityId = params.id as string;

  const opportunity = await getOpportunityDetails({
    memberId,
    opportunityId,
  });

  if (!opportunity) {
    throw new Response(null, {
      status: 404,
      statusText: 'The opportunity you are looking for does not exist.',
    });
  }

  job('opportunity.check_expired', {
    opportunityId,
  });

  Object.assign(opportunity, {
    createdAt: dayjs().to(opportunity.createdAt),

    expiresAt: run(() => {
      const expiresAt = dayjs(opportunity.expiresAt);

      return expiresAt.isAfter(new Date())
        ? `Expires in ${expiresAt.toNow()}`
        : `Expired ${expiresAt.fromNow()} ago`;
    }),

    slackMessageText: emojify(opportunity.slackMessageText || '', {
      fallback: '',
    }),

    slackMessagePostedAt: dayjs().to(opportunity.slackMessagePostedAt),
  });

  track({
    event: 'Opportunity Viewed',
    properties: { Company: opportunity.companyName as string },
    request,
    user: memberId,
  });

  return json(opportunity);
}

export default function Opportunity() {
  const { companyId, companyLogo, companyName } =
    useLoaderData<typeof loader>();

  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/opportunities'],
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
          <OpportunityTitle />
        </div>

        <div className="flex items-center gap-[inherit]">
          <EditOpportunityButton />
          <Modal.CloseButton />
        </div>
      </Modal.Header>

      <OpportunityTags />
      <OpportunityDescription />
      <div />
      <OpportunitySlackMessage />
    </Modal>
  );
}

function OpportunityTitle() {
  const { bookmarked, createdAt, expiresAt, id, title } =
    useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-1">
      <BookmarkForm opportunityId={id}>
        <Text className="inline" variant="lg">
          <span className="mr-2">{title}</span>
          <span className="inline-flex align-top">
            <BookmarkButton bookmarked={!!bookmarked} />
          </span>
        </Text>
      </BookmarkForm>

      <Text color="gray-500" variant="sm">
        Posted {createdAt} ago &bull; {expiresAt}
      </Text>
    </div>
  );
}

function EditOpportunityButton() {
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
          pathname: generatePath(Route['/opportunities/:id/edit'], { id }),
          search: searchParams.toString(),
        }}
      >
        <Edit />
      </Link>

      <div className="h-6 w-[1px] bg-gray-100" />
    </>
  );
}

function OpportunityTags() {
  const { tags } = useLoaderData<typeof loader>();

  if (!tags) {
    return null;
  }

  return (
    <ul className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => {
        return (
          <li key={tag.id}>
            <Pill color={tag.color}>{tag.name}</Pill>
          </li>
        );
      })}
    </ul>
  );
}

function OpportunityDescription() {
  const { description } = useLoaderData<typeof loader>();

  if (!description) {
    return null;
  }

  return <Text color="gray-500">{description}</Text>;
}

function OpportunitySlackMessage() {
  const {
    posterFirstName,
    posterLastName,
    posterProfilePicture,
    slackMessageChannelId,
    slackMessageId,
    slackMessagePostedAt,
    slackMessageText,
  } = useLoaderData<typeof loader>();

  return (
    <SlackMessageCard
      channelId={slackMessageChannelId || ''}
      messageId={slackMessageId || ''}
      postedAt={slackMessagePostedAt || ''}
      posterFirstName={posterFirstName || ''}
      posterLastName={posterLastName || ''}
      posterProfilePicture={posterProfilePicture || ''}
      text={slackMessageText || ''}
    />
  );
}
