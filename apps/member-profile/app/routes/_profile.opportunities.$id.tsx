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

import { track } from '@oyster/core/mixpanel';
import { getOpportunityDetails } from '@oyster/core/opportunities';
import { getIconButtonCn, Modal, Pill, Text } from '@oyster/ui';

import {
  BookmarkButton,
  BookmarkForm,
} from '@/routes/_profile.opportunities.$id_.bookmark';
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

  Object.assign(opportunity, {
    createdAt: dayjs().to(opportunity.createdAt),

    expiresAt:
      opportunity.expiresAt > new Date()
        ? dayjs(opportunity.expiresAt).to(new Date())
        : dayjs().to(opportunity.expiresAt),

    slackMessageText: emojify(opportunity.slackMessageText || '', {
      fallback: '',
    }),

    slackMessagePostedAt: dayjs().to(opportunity.slackMessagePostedAt),
  });

  if (memberId !== opportunity.postedBy) {
    track({
      event: 'Opportunity Viewed',
      properties: { Company: opportunity.companyName as string },
      request,
      user: memberId,
    });
  }

  return json(opportunity);
}

export default function Opportunity() {
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
          <CompanyLink />
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
        Posted {createdAt} ago &bull; Expires in {expiresAt}
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
    id,
    posterFirstName,
    posterLastName,
    posterProfilePicture,
    slackMessageChannelId,
    slackMessagePostedAt,
    slackMessageText,
  } = useLoaderData<typeof loader>();

  return (
    <SlackMessageCard
      channelId={slackMessageChannelId || ''}
      messageId={id}
      postedAt={slackMessagePostedAt || ''}
      posterFirstName={posterFirstName || ''}
      posterLastName={posterLastName || ''}
      posterProfilePicture={posterProfilePicture || ''}
      text={slackMessageText || ''}
    />
  );
}
