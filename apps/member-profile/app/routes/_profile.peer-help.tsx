import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  type LinkProps,
  Outlet,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { type PropsWithChildren } from 'react';
import { Calendar, Clock, Info } from 'react-feather';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { ListSearchParams } from '@oyster/core/member-profile/ui';
import { db } from '@oyster/db';
import {
  Button,
  cx,
  Dashboard,
  Pagination,
  Pill,
  ProfilePicture,
  Text,
} from '@oyster/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from '@oyster/ui/tooltip';
import { toTitleCase } from '@oyster/utils';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

const PeerHelpSearchParams = ListSearchParams.pick({
  limit: true,
  page: true,
}).extend({
  view: z.enum(['me', 'open']).catch('open'),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);
  const memberId = user(session);

  const url = new URL(request.url);

  const { limit, page, view } = PeerHelpSearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  const [
    { count: openCount },
    { count: myCount },
    { helpRequests, totalCount },
  ] = await Promise.all([
    db
      .selectFrom('helpRequests')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('status', '=', 'open')
      .executeTakeFirstOrThrow(),

    db
      .selectFrom('helpRequests')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where((eb) => {
        return eb.or([
          eb('helpeeId', '=', memberId),
          eb('helperId', '=', memberId),
        ]);
      })
      .executeTakeFirstOrThrow(),

    listHelpRequests({ memberId, view }),
  ]);

  return json({
    helpRequests,
    limit,
    myCount,
    openCount,
    page,
    totalCount,
    view,
  });
}

type listHelpRequestsProps = {
  memberId: string;
  view: 'me' | 'open';
};

async function listHelpRequests({ memberId, view }: listHelpRequestsProps) {
  const query = db
    .selectFrom('helpRequests')
    .$if(view === 'me', (eb) => {
      return eb.where((eb) => {
        return eb.or([
          eb('helpeeId', '=', memberId),
          eb('helperId', '=', memberId),
        ]);
      });
    })
    .$if(view === 'open', (eb) => {
      return eb.where('status', '=', 'open').where('helperId', 'is', null);
    });

  const [records, { count }] = await Promise.all([
    query
      .leftJoin('students as helpees', 'helpees.id', 'helpRequests.helpeeId')
      .leftJoin('students as helpers', 'helpers.id', 'helpRequests.helperId')
      .select([
        'helpees.firstName as helpeeFirstName',
        'helpees.lastName as helpeeLastName',
        'helpees.profilePicture as helpeeProfilePicture',
        'helpers.firstName as helperFirstName',
        'helpers.lastName as helperLastName',
        'helpers.profilePicture as helperProfilePicture',
        'helpRequests.createdAt',
        'helpRequests.description',
        'helpRequests.helpBy',
        'helpRequests.helpeeId',
        'helpRequests.id',
        'helpRequests.summary',
        'helpRequests.type',
      ])
      .orderBy('helpRequests.helpBy', 'asc')
      .orderBy('helpRequests.createdAt', 'desc')
      .execute(),

    query
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  const helpRequests = records.map(({ createdAt, ...record }) => {
    const createdAtObject = dayjs(createdAt);

    return {
      ...record,
      createdAt: createdAtObject.fromNow(),
      createdAtExpanded: createdAtObject.format('MMM DD, YYYY • h:mm A'),
    };
  });

  return {
    helpRequests,
    totalCount: Number(count),
  };
}

// Page

export default function PeerHelpLayout() {
  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Peer Help 💬</Dashboard.Title>
        <RequestHelpButton />
      </Dashboard.Header>

      <HelpRequestsNavigation />
      <HelpRequestsList />
      <HelpRequestsPagination />
      <Outlet />
    </>
  );
}

function HelpRequestsNavigation() {
  const { myCount, openCount, view } = useLoaderData<typeof loader>();

  return (
    <nav>
      <ul className="flex items-center gap-4">
        <NavigationItem
          active={view === 'open'}
          to={{
            pathname: Route['/peer-help'],
            search: '', // The default view is open requests.
          }}
        >
          Open Requests ({openCount})
        </NavigationItem>

        <NavigationItem
          active={view === 'me'}
          to={{
            pathname: Route['/peer-help'],
            search: new URLSearchParams({ view: 'me' }).toString(),
          }}
        >
          My Requests ({myCount})
        </NavigationItem>
      </ul>
    </nav>
  );
}

function HelpRequestsPagination() {
  const { helpRequests, page, limit, totalCount } =
    useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={helpRequests.length}
      page={page}
      pageSize={limit}
      totalCount={totalCount}
    />
  );
}

function RequestHelpButton() {
  const [searchParams] = useSearchParams();

  return (
    <Button.Slot size="small">
      <Link
        to={{
          pathname: Route['/peer-help/request'],
          search: searchParams.toString(),
        }}
      >
        Request Help
      </Link>
    </Button.Slot>
  );
}

type NavigationItemProps = PropsWithChildren<{
  active?: boolean;
  to: LinkProps['to'];
}>;

// Needed to create a custom navigation item for this because we're using query
// params to determine the active state, not pathnames.
function NavigationItem({ active, children, to }: NavigationItemProps) {
  return (
    <li>
      <Link
        className={cx(
          'underline hover:text-primary',
          active && 'text-primary underline'
        )}
        to={to}
      >
        {children}
      </Link>
    </li>
  );
}

function HelpRequestsList({ children }: PropsWithChildren) {
  const { helpRequests } = useLoaderData<typeof loader>();

  return (
    <ul className="grid grid-cols-1 gap-2 @[800px]:grid-cols-2 @[1200px]:grid-cols-3 @[1600px]:grid-cols-4">
      {helpRequests.map((helpRequest) => {
        return <HelpRequestItem key={helpRequest.id} {...helpRequest} />;
      })}
      {children}
    </ul>
  );
}

type HelpRequest = SerializeFrom<typeof loader>['helpRequests'][number];

function HelpRequestItem({
  createdAt,
  createdAtExpanded,
  description,
  helpBy,
  helpeeFirstName,
  helpeeId,
  helpeeLastName,
  helpeeProfilePicture,
  helperFirstName,
  helperLastName,
  helperProfilePicture,
  id,
  summary,
  type,
}: HelpRequest) {
  const [searchParams] = useSearchParams();

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-4">
      <div className="flex justify-between gap-2">
        <div className="flex items-center gap-1">
          <Pill
            className="flex items-center gap-1"
            color={match(type)
              .with('career_advice', () => 'pink-100' as const)
              .with('resume_review', () => 'blue-100' as const)
              .with('mock_interview', () => 'purple-100' as const)
              .otherwise(() => 'gray-100' as const)}
          >
            <Info size={12} /> {toTitleCase(type)}
          </Pill>

          <Pill className="flex items-center gap-1" color="gray-100">
            <Clock size={12} /> ASAP
          </Pill>
        </div>

        <Link
          className="link"
          to={{
            pathname: generatePath(Route['/peer-help/:id'], { id }),
            search: searchParams.toString(),
          }}
        >
          View
        </Link>
      </div>

      <Text className="line-clamp-3" color="gray-500" variant="sm">
        {description}
      </Text>

      <footer className="mt-auto flex items-center justify-between gap-2">
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

        {/* <ResourceActionGroup
          editable={editable}
          id={id}
          shareableUri={shareableUri}
        /> */}
      </footer>
    </li>
  );
}

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
