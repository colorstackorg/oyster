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
import { ArrowRight, Check, Edit, Info, Loader, User } from 'react-feather';
import { z } from 'zod';

import { ListSearchParams } from '@oyster/core/member-profile/ui';
import { HelpRequestStatus, HelpRequestType } from '@oyster/core/peer-help';
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
  HelpRequestDescription,
  HelpRequestStatusPill,
  HelpRequestTypePill,
} from '@/shared/components/peer-help';
import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

const PeerHelpSearchParams = ListSearchParams.pick({
  limit: true,
  page: true,
}).extend({
  status: z.nativeEnum(HelpRequestStatus).nullable().catch(null),
  type: z.nativeEnum(HelpRequestType).nullable().catch(null),
  view: z.enum(['me']).nullable().catch(null),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);
  const memberId = user(session);

  const { searchParams } = new URL(request.url);
  const { limit, page, status, type, view } = PeerHelpSearchParams.parse(
    Object.fromEntries(searchParams)
  );

  const { helpRequests, totalCount } = await listHelpRequests({
    memberId,
    status,
    timezone: getTimezone(request),
    type,
    view,
  });

  return json({
    helpRequests,
    limit,
    page,
    totalCount,
    view,
  });
}

type ListHelpRequestsProps = {
  memberId: string;
  status: HelpRequestStatus | null;
  timezone: string;
  type: HelpRequestType | null;
  view: 'me' | null;
};

async function listHelpRequests({
  memberId,
  status,
  timezone,
  type,
  view,
}: ListHelpRequestsProps) {
  const query = db
    .selectFrom('helpRequests')
    .where('helpRequests.status', '!=', HelpRequestStatus.NOT_RECEIVED)
    .$if(view === 'me', (eb) => {
      return eb.where((eb) => {
        return eb.or([
          eb('helpRequests.helpeeId', '=', memberId),
          eb('helpRequests.helperId', '=', memberId),
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
        'helpRequests.type',
        (eb) => {
          return eb('finishedAt', 'is not', null).as('finished');
        },
        (eb) => {
          return eb('helpeeId', '=', memberId).as('isHelpee');
        },
      ])
      .orderBy((eb) => {
        return eb
          .case()
          .when('helpRequests.status', '=', HelpRequestStatus.REQUESTED)
          .then(1)
          .when('helpRequests.status', '=', HelpRequestStatus.OFFERED)
          .then(2)
          .when('helpRequests.status', '=', HelpRequestStatus.RECEIVED)
          .then(3)
          .else(4)
          .end();
      })
      .orderBy('helpRequests.createdAt', 'desc')
      .execute(),

    query
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  const helpRequests = records.map(({ createdAt, status, type, ...record }) => {
    const createdAtObject = dayjs(createdAt).tz(timezone);

    return {
      ...record,
      createdAt: createdAtObject.fromNow(),
      createdAtExpanded: createdAtObject.format('MMM DD, YYYY • h:mm A'),
      status: status as HelpRequestStatus,
      type: type as HelpRequestType,
    };
  });

  return {
    helpRequests,
    totalCount: Number(count),
  };
}

// Page

export default function PeerHelp() {
  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Peer Help 💬</Dashboard.Title>
        <RequestHelpButton />
      </Dashboard.Header>

      <Text className="-mt-3" color="gray-500" variant="sm">
        Request mock interviews, resume reviews, and career advice from your
        ColorStack peers.
      </Text>

      <div className="flex flex-wrap items-center gap-2">
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

      if (params.get('view') === 'me') {
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
    { color: 'amber-100', label: 'Requested', value: 'requested' },
    { color: 'orange-100', label: 'Offered', value: 'offered' },
    { color: 'lime-100', label: 'Received', value: 'received' },
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

  const type = searchParams.get('type');

  const options: FilterValue[] = [
    { color: 'pink-100', label: 'Career Advice', value: 'career_advice' },
    { color: 'purple-100', label: 'Mock Interview', value: 'mock_interview' },
    { color: 'blue-100', label: 'Resume Review', value: 'resume_review' },
  ];

  const selectedValues = options.filter((option) => {
    return type === option.value;
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
    <Button.Slot>
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

  if (!helpRequests.length) {
    return (
      <Text className="mt-2" color="gray-500" variant="sm">
        No help requests found.
      </Text>
    );
  }

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
  finished,
  helpeeFirstName,
  helpeeId,
  helpeeLastName,
  helpeeProfilePicture,
  helperFirstName,
  helperId,
  helperLastName,
  id,
  isHelpee,
  status,
  type,
}: HelpRequest) {
  const [searchParams] = useSearchParams();

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-4">
      <header className="flex justify-between gap-2">
        <div className="flex items-center gap-1">
          <HelpRequestTypePill type={type} />
          <HelpRequestStatusPill status={status} />
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
      </header>

      <Tooltip>
        <TooltipTrigger cursor="default">
          <HelpRequestDescription className="line-clamp-2">
            {description}
          </HelpRequestDescription>
        </TooltipTrigger>

        <TooltipContent side="bottom">
          <TooltipText>{description}</TooltipText>
        </TooltipContent>
      </Tooltip>

      {helperId && (
        <Helper
          firstName={helperFirstName}
          id={helperId}
          lastName={helperLastName}
        />
      )}

      <footer className="mt-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Helpee
            firstName={helpeeFirstName}
            id={helpeeId}
            lastName={helpeeLastName}
            profilePicture={helpeeProfilePicture}
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

        {!!isHelpee && status === 'requested' && (
          <EditButton id={id} isHelpee={isHelpee} status={status} />
        )}

        {!!isHelpee && status === 'offered' && (
          <FinishButton
            finished={finished}
            id={id}
            isHelpee={isHelpee}
            status={status}
          />
        )}
      </footer>
    </li>
  );
}

type HelpeeProps = {
  firstName: HelpRequest['helpeeFirstName'];
  id: HelpRequest['helpeeId'];
  lastName: HelpRequest['helpeeLastName'];
  profilePicture: HelpRequest['helpeeProfilePicture'];
};

function Helpee({ firstName, id, lastName, profilePicture }: HelpeeProps) {
  return (
    <div className="flex w-fit items-center gap-2">
      <ProfilePicture
        initials={firstName![0] + lastName![0]}
        size="32"
        src={profilePicture || undefined}
      />

      <Link
        className="line-clamp-1 text-sm text-gray-500 hover:underline"
        target="_blank"
        to={generatePath(Route['/directory/:id'], { id: id || '' })}
      >
        {firstName} {lastName}
      </Link>
    </div>
  );
}

type HelperProps = {
  firstName: HelpRequest['helperFirstName'];
  id: HelpRequest['helperId'];
  lastName: HelpRequest['helperLastName'];
};

function Helper({ firstName, id, lastName }: HelperProps) {
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

function EditButton({
  id,
  isHelpee,
  status,
}: Pick<HelpRequest, 'id' | 'isHelpee' | 'status'>) {
  const [searchParams] = useSearchParams();

  if (!isHelpee || status !== 'requested') {
    return null;
  }

  return (
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
        <TooltipText>Edit Request</TooltipText>
      </TooltipContent>
    </Tooltip>
  );
}

function FinishButton({
  finished,
  id,
  isHelpee,
  status,
}: Pick<HelpRequest, 'finished' | 'id' | 'isHelpee' | 'status'>) {
  const [searchParams] = useSearchParams();

  if (!isHelpee || status !== 'offered') {
    return null;
  }

  if (finished) {
    return (
      <Text color="primary" variant="sm" weight="500">
        Finished <Check className="inline" size={16} />
      </Text>
    );
  }

  return (
    <Button.Slot size="sm">
      <Link
        to={{
          pathname: generatePath(Route['/peer-help/:id/finish'], { id }),
          search: searchParams.toString(),
        }}
      >
        Finish <ArrowRight size={16} />
      </Link>
    </Button.Slot>
  );
}
