import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { ArrowRight } from 'react-feather';
import { match } from 'ts-pattern';

import { db } from '@oyster/db';
import { Button, Modal, Pill, ProfilePicture, Text } from '@oyster/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';
import { toTitleCase } from '@oyster/utils';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const helpRequest = await db
    .selectFrom('helpRequests')
    .leftJoin('students as helpees', 'helpees.id', 'helpRequests.helpeeId')
    .leftJoin('students as helpers', 'helpers.id', 'helpRequests.helperId')
    .select([
      'helpees.firstName as helpeeFirstName',
      'helpees.lastName as helpeeLastName',
      'helpees.profilePicture as helpeeProfilePicture',
      'helpRequests.createdAt',
      'helpRequests.description',
      'helpRequests.helpeeId',
      'helpRequests.helperId',
      'helpRequests.id',
      'helpRequests.status',
      'helpRequests.summary',
      'helpRequests.type',
    ])
    .where('helpRequests.id', '=', params.id as string)
    .executeTakeFirstOrThrow();

  if (!helpRequest) {
    throw new Response(null, {
      status: 404,
      statusText: 'The help request you are looking for does not exist.',
    });
  }

  const createdAtObject = dayjs(helpRequest.createdAt);

  return json({
    ...helpRequest,
    createdAt: createdAtObject.fromNow(),
    createdAtExpanded: createdAtObject.format('MMM DD, YYYY • h:mm A'),
    isMe: helpRequest.helpeeId === user(session),
  });
}

export default function HelpRequestModal() {
  const {
    createdAt,
    createdAtExpanded,
    description,
    helpeeFirstName,
    helpeeId,
    helpeeLastName,
    helpeeProfilePicture,
    id,
    isMe,
    type,
  } = useLoaderData<typeof loader>();

  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/peer-help'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Help Request</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <div className="flex flex-col gap-4">
        <Pill
          color={match(type)
            .with('career_advice', () => 'pink-100' as const)
            .with('resume_review', () => 'blue-100' as const)
            .with('mock_interview', () => 'purple-100' as const)
            .otherwise(() => 'gray-100' as const)}
        >
          {toTitleCase(type)}
        </Pill>

        <Text
          className="border-l border-gray-300 pl-2"
          color="gray-500"
          variant="sm"
        >
          {description}
        </Text>

        <footer className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <Helpee
              helpeeFirstName={helpeeFirstName}
              helpeeId={helpeeId}
              helpeeLastName={helpeeLastName}
              helpeeProfilePicture={helpeeProfilePicture}
            />

            <Text color="gray-500" variant="sm">
              &bull;
            </Text>

            <Tooltip>
              <TooltipTrigger className="cursor-auto text-sm text-gray-500">
                {createdAt}
              </TooltipTrigger>
              <TooltipContent>
                <TooltipText>{createdAtExpanded}</TooltipText>
              </TooltipContent>
            </Tooltip>
          </div>

          {!isMe && (
            <Button.Slot size="small" variant="primary">
              <Link to={generatePath(Route['/peer-help/:id/offer'], { id })}>
                Offer Help <ArrowRight />
              </Link>
            </Button.Slot>
          )}
        </footer>
      </div>
    </Modal>
  );
}

type HelpRequest = SerializeFrom<typeof loader>;

function Helpee({
  helpeeFirstName: firstName,
  helpeeId: id,
  helpeeLastName: lastName,
  helpeeProfilePicture: profilePicture,
}: Pick<
  HelpRequest,
  'helpeeFirstName' | 'helpeeId' | 'helpeeLastName' | 'helpeeProfilePicture'
>) {
  return (
    <div className="flex w-fit items-center gap-2">
      <ProfilePicture
        initials={firstName![0] + lastName![0]}
        size="32"
        src={profilePicture || undefined}
      />

      <Link
        className="text-sm text-gray-500 hover:underline"
        target="_blank"
        to={generatePath(Route['/directory/:id'], { id })}
      >
        {firstName} {lastName}
      </Link>
    </div>
  );
}
