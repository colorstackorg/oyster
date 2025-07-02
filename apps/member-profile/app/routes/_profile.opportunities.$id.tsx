import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  useFetcher,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { emojify } from 'node-emoji';
import { Edit, Flag } from 'react-feather';

import { job } from '@oyster/core/bull';
import { track } from '@oyster/core/mixpanel';
import {
  getOpportunityDetails,
  reportOpportunity,
} from '@oyster/core/opportunities';
import { db } from '@oyster/db';
import {
  Dropdown,
  getIconButtonCn,
  IconButton,
  Modal,
  Pill,
  Text,
} from '@oyster/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';
import { run } from '@oyster/utils';

import {
  BookmarkButton,
  BookmarkForm,
} from '@/routes/_profile.opportunities.$id_.bookmark';
import { CompanyLink } from '@/shared/components';
import { SlackMessageCard } from '@/shared/components/slack-message';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);
  const opportunityId = params.id as string;

  const [_opportunity, report] = await Promise.all([
    getOpportunityDetails({
      memberId,
      opportunityId,
    }),

    db
      .selectFrom('opportunityReports')
      .where('opportunityId', '=', opportunityId)
      .where('reporterId', '=', memberId)
      .executeTakeFirst(),
  ]);

  if (!_opportunity) {
    throw new Response(null, {
      status: 404,
      statusText: 'The opportunity you are looking for does not exist.',
    });
  }

  job('opportunity.check_expired', {
    opportunityId,
  });

  const opportunity = {
    ..._opportunity,

    createdAt: dayjs().to(_opportunity.createdAt),

    expiresAt: run(() => {
      const expiresAt = dayjs(_opportunity.expiresAt);

      return expiresAt.isAfter(new Date())
        ? `Expires in ${expiresAt.toNow()}`
        : `Expired ${expiresAt.fromNow()} ago`;
    }),

    slackMessageText: emojify(_opportunity.slackMessageText || '', {
      fallback: '',
    }),

    slackMessagePostedAt: dayjs().to(_opportunity.slackMessagePostedAt),
  };

  track({
    event: 'Opportunity Viewed',
    properties: { Company: opportunity.companyName as string },
    request,
    user: memberId,
  });

  return { ...opportunity, reported: !!report };
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const formData = await request.formData();

  const result = await reportOpportunity({
    reporterId: user(session),
    opportunityId: params.id as string,
    reason: formData.get('reason') as string,
  });

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'Opportunity reported!',
  });

  return json(
    {},
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

export default function Opportunity() {
  const {
    companyId,
    companyLogo,
    companyName,
    slackMessageChannelId,
    slackMessageId,
  } = useLoaderData<typeof loader>();

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
          <ReportButton />
          <div className="h-6 w-[1px] bg-gray-100" />
          <Modal.CloseButton />
        </div>
      </Modal.Header>

      <OpportunityTags />
      <OpportunityDescription />

      {slackMessageChannelId && slackMessageId && (
        <>
          <div />
          <OpportunitySlackMessage />
        </>
      )}
    </Modal>
  );
}

function OpportunityTitle() {
  const { bookmarked, createdAt, expiresAt, id, link, title } =
    useLoaderData<typeof loader>();

  const titleElement = link ? (
    <a className="link mr-2" href={link} target="_blank">
      {title}
    </a>
  ) : (
    <span className="mr-2">{title}</span>
  );

  return (
    <div className="flex flex-col gap-1">
      <BookmarkForm opportunityId={id}>
        <Text className="inline" variant="lg">
          {titleElement}
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

function ReportButton() {
  const { reported } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  let disabled = reported;

  if (fetcher.formData) {
    disabled = !!fetcher.formData?.get('reason');
  }

  return (
    <Dropdown.Root>
      <Tooltip>
        <Dropdown.Trigger>
          <TooltipTrigger asChild>
            <IconButton
              backgroundColor="gray-100"
              backgroundColorOnHover="gray-200"
              disabled={disabled}
              icon={<Flag />}
            />
          </TooltipTrigger>
        </Dropdown.Trigger>

        <TooltipContent side="bottom">
          <TooltipText>
            {reported ? 'You reported this opportunity.' : 'Report'}
          </TooltipText>
        </TooltipContent>
      </Tooltip>

      <Dropdown>
        <fetcher.Form method="post">
          <Dropdown.List>
            <ReportItem label="This is no longer open." value="closed" />
            <ReportItem label="This link is broken." value="broken" />
            <ReportItem label="This is a duplicate." value="duplicate" />
          </Dropdown.List>
        </fetcher.Form>

        <div className="max-w-72 gap-2 border-t border-t-gray-200 p-2">
          <Text color="gray-500" variant="xs">
            When an opportunity is reported 2 times, it will be removed from the
            board.
          </Text>
        </div>
      </Dropdown>
    </Dropdown.Root>
  );
}

type ReportItemProps = {
  label: string;
  value: string;
};

function ReportItem({ label, value }: ReportItemProps) {
  return (
    <Dropdown.Item>
      <button className="text-sm" name="reason" type="submit" value={value}>
        {label}
      </button>
    </Dropdown.Item>
  );
}

function EditOpportunityButton() {
  const { hasWritePermission, id } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  if (!hasWritePermission) {
    return null;
  }

  return (
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
