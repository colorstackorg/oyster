import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  Outlet,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { type PropsWithChildren } from 'react';
import { Edit, Info, Loader, User } from 'react-feather';
import { z } from 'zod';

import { ListSearchParams } from '@oyster/core/member-profile/ui';
import { db } from '@oyster/db';
import {
  Button,
  Dashboard,
  IconButton,
  Pagination,
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

import {
  HelpRequestStatus,
  HelpRequestType,
} from '@/shared/components/peer-help';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

const PeerHelpSearchParams = ListSearchParams.pick({
  limit: true,
  page: true,
}).extend({
  status: z
    .enum(['open', 'pending', 'complete', 'incomplete'])
    .nullable()
    .catch(null),
  type: z
    .enum(['career_advice', 'mock_interview', 'resume_review'])
    .nullable()
    .catch(null),
  view: z.enum(['me']).nullable().catch(null),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);
  const memberId = user(session);

  const url = new URL(request.url);

  const { limit, page, status, type, view } = PeerHelpSearchParams.parse(
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

    listHelpRequests({ memberId, status, type, view }),
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
  status: 'open' | 'pending' | 'complete' | 'incomplete' | null;
  type: 'career_advice' | 'mock_interview' | 'resume_review' | null;
  view: 'me' | null;
};

async function listHelpRequests({
  memberId,
  status,
  type,
  view,
}: listHelpRequestsProps) {
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
    .$if(!!status, (eb) => {
      return eb.where('helpRequests.status', '=', status);
    })
    .$if(!!type, (eb) => {
      return eb.where('helpRequests.type', '=', type);
    });

  const [records, { count }] = await Promise.all([
    query
      .leftJoin('students as helpees', 'helpees.id', 'helpRequests.helpeeId')
      .leftJoin('students as helpers', 'helpers.id', 'helpRequests.helperId')
      .select([
        'helpees.firstName as helpeeFirstName',
        'helpees.id as helpeeId',
        'helpees.lastName as helpeeLastName',
        'helpees.profilePicture as helpeeProfilePicture',
        'helpers.firstName as helperFirstName',
        'helpers.id as helperId',
        'helpers.lastName as helperLastName',
        'helpRequests.createdAt',
        'helpRequests.description',
        'helpRequests.id',
        'helpRequests.status',
        'helpRequests.summary',
        'helpRequests.type',
        (eb) => {
          return eb('helpeeId', '=', memberId)
            .and('status', '!=', 'pending')
            .as('editable');
        },
      ])
      .orderBy((eb) => {
        return eb
          .case()
          .when('helpRequests.status', '=', 'open')
          .then(1)
          .when('helpRequests.status', '=', 'pending')
          .then(2)
          .when('helpRequests.status', '=', 'complete')
          .then(3)
          .when('helpRequests.status', '=', 'incomplete')
          .then(4)
          .else(5)
          .end();
      })
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
        <StatusFilter />
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

function StatusFilter() {
  const [searchParams] = useSearchParams();

  const status = searchParams.get('status');

  const options: FilterValue[] = [
    { color: 'amber-100', label: 'Help Needed', value: 'open' },
    { color: 'orange-100', label: 'Helper Assigned', value: 'pending' },
    { color: 'lime-100', label: 'Help Received', value: 'complete' },
    { color: 'red-100', label: 'Help Not Received', value: 'incomplete' },
  ];

  const selectedValues = options.filter((option) => {
    return status === option.value;
  });

  return (
    <FilterRoot name="status" selectedValues={selectedValues}>
      <FilterTrigger icon={<Loader />}>Status</FilterTrigger>

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
  helperId,
  helperLastName,
  id,
  status,
  type,
}: HelpRequest) {
  const [searchParams] = useSearchParams();

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-4">
      <div className="flex justify-between gap-2">
        <div className="flex items-center gap-1">
          <HelpRequestType type={type} />
          <HelpRequestStatus status={status} />
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

      <Tooltip>
        <TooltipTrigger cursor="default">
          <Text
            className="line-clamp-2 border-l border-gray-300 pl-2"
            color="gray-500"
            variant="sm"
          >
            {description}
          </Text>
        </TooltipTrigger>

        <TooltipContent side="bottom">
          <TooltipText>{description}</TooltipText>
        </TooltipContent>
      </Tooltip>

      {helperId && (
        <Helper
          helperFirstName={helperFirstName}
          helperId={helperId}
          helperLastName={helperLastName}
        />
      )}

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

function Helper({
  helperFirstName: firstName,
  helperId: id,
  helperLastName: lastName,
}: Pick<HelpRequest, 'helperFirstName' | 'helperId' | 'helperLastName'>) {
  return (
    <div className="flex w-full items-center gap-1 rounded-lg bg-gray-50 p-2">
      <User className="text-gray-500" size={16} />
      <Text color="gray-500" variant="sm">
        Helper:
      </Text>

      <Link
        className="link text-sm hover:underline"
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
