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
import { Edit, Info, User } from 'react-feather';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { ListSearchParams } from '@oyster/core/member-profile/ui';
import { db } from '@oyster/db';
import {
  Button,
  cx,
  Dashboard,
  IconButton,
  Pagination,
  Pill,
  ProfilePicture,
  Text,
} from '@oyster/ui';
import { FilterList } from '@oyster/ui/filter';
import { FilterPopover, FilterRoot, FilterTrigger } from '@oyster/ui/filter';
import { type FilterValue } from '@oyster/ui/filter';
import { FilterItem } from '@oyster/ui/filter';
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
        'helpRequests.helpeeId',
        'helpRequests.id',
        'helpRequests.summary',
        'helpRequests.type',
        (eb) => eb('helpeeId', '=', memberId).as('editable'),
      ])
      .orderBy('helpRequests.createdAt', 'desc')
      .execute(),

    query
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  const helpRequests = records.map(({ createdAt, editable, ...record }) => {
    const createdAtObject = dayjs(createdAt);

    return {
      ...record,
      createdAt: createdAtObject.fromNow(),
      createdAtExpanded: createdAtObject.format('MMM DD, YYYY • h:mm A'),
      editable: !!editable,
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

      <Text className="-mt-3" color="gray-500" variant="sm">
        Peer Help is an easy way for members to get 1:1 help from each other.
      </Text>

      <div className="flex items-center gap-2">
        <MeFilter />
        <TypeFilter />
      </div>

      <HelpRequestsList />
      <HelpRequestsPagination />
      <Outlet />
    </>
  );
}

function MeFilter() {
  const [searchParams, setSearchParams] = useSearchParams();

  function toggle() {
    setSearchParams((params) => {
      params.delete('page');

      if (searchParams.get('view') === 'me') {
        params.delete('view');
      } else {
        params.set('view', 'me');
      }

      return params;
    });
  }

  return (
    <FilterTrigger
      active={searchParams.get('view') === 'me'}
      icon={<User />}
      onClick={toggle}
      popover={false}
    >
      My Requests
    </FilterTrigger>
  );
}

function TypeFilter() {
  const [searchParams] = useSearchParams();

  const ranges = searchParams.getAll('type');

  const options: FilterValue[] = [
    { color: 'pink-100', label: 'Career Advice', value: 'career_advice' },
    { color: 'purple-100', label: 'Mock Interview', value: 'mock_interview' },
    { color: 'blue-100', label: 'Resume Review', value: 'resume_review' },
  ];

  const selectedValues = options.filter((option) => {
    return ranges.includes(option.value);
  });

  return (
    <FilterRoot name="type" selectedValues={selectedValues}>
      <FilterTrigger icon={<Info />}>Type</FilterTrigger>

      <FilterPopover>
        <FilterList height="max">
          {options.map((option) => {
            return (
              <FilterItem
                color={option.color}
                key={option.value}
                label={option.label}
                value={option.value}
              />
            );
          })}
        </FilterList>
      </FilterPopover>
    </FilterRoot>
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
  editable,
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
        <Pill
          color={match(type)
            .with('career_advice', () => 'pink-100' as const)
            .with('resume_review', () => 'blue-100' as const)
            .with('mock_interview', () => 'purple-100' as const)
            .otherwise(() => 'gray-100' as const)}
        >
          {toTitleCase(type)}
        </Pill>

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

      <Tooltip>
        <TooltipTrigger cursor="default">
          <Text className="line-clamp-3" color="gray-500" variant="sm">
            {description}
          </Text>
        </TooltipTrigger>

        <TooltipContent side="bottom">
          <TooltipText>{description}</TooltipText>
        </TooltipContent>
      </Tooltip>

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

        <HelpRequestActionGroup editable={editable} id={id} />
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

function HelpRequestActionGroup({
  editable,
  id,
}: Pick<HelpRequest, 'editable' | 'id'>) {
  const [searchParams] = useSearchParams();

  if (!editable) {
    return null;
  }

  return (
    <ul className="flex items-center gap-1">
      <li>
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton.Slot
              backgroundColor="gray-100"
              backgroundColorOnHover="gray-200"
            >
              <Link
                to={{
                  pathname: generatePath(Route['/peer-help/:id/edit'], { id }),
                  search: searchParams.toString(),
                }}
              >
                <Edit />
              </Link>
            </IconButton.Slot>
          </TooltipTrigger>

          <TooltipContent>
            <TooltipText>Edit Resource</TooltipText>
          </TooltipContent>
        </Tooltip>
      </li>
    </ul>
  );
}
