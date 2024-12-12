import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { sql } from 'kysely';
import { useState } from 'react';
import { Plus } from 'react-feather';
import { generatePath } from 'react-router';
import { type z } from 'zod';

import { ListSearchParams } from '@oyster/core/admin-dashboard/ui';
import { db } from '@oyster/db';
import {
  ACCENT_COLORS,
  Button,
  Dashboard,
  Dropdown,
  Pagination,
  Pill,
  type PillProps,
  Table,
  type TableColumnProps,
  useSearchParams,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated } from '@/shared/session.server';

const OnboardingSessionsSearchParams = ListSearchParams.omit({
  search: true,
});

type OnboardingSessionsSearchParams = z.infer<
  typeof OnboardingSessionsSearchParams
>;

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'ambassador',
  });

  const url = new URL(request.url);

  const searchParams = OnboardingSessionsSearchParams.parse({
    ...Object.fromEntries(url.searchParams),
    timezone: getTimezone(request),
  });

  const [sessions, totalCount] = await Promise.all([
    listOnboardingSessions(searchParams),
    countOnboardingSessions(),
  ]);

  return json({
    sessions,
    totalCount,
  });
}

async function listOnboardingSessions({
  limit,
  page,
}: OnboardingSessionsSearchParams) {
  const attendeesAggregation = sql<string>`
    string_agg(
      students.first_name || ' ' || students.last_name,
      ', '
      ORDER BY
        students.first_name,
        students.last_name
    )
  `.as('attendees');

  const rows = await db
    .selectFrom('onboardingSessions')
    .leftJoin(
      'onboardingSessionAttendees',
      'onboardingSessionAttendees.sessionId',
      'onboardingSessions.id'
    )
    .leftJoin('students', 'students.id', 'onboardingSessionAttendees.studentId')
    .leftJoin('admins', 'admins.id', 'onboardingSessions.uploadedById')
    .select([
      'admins.firstName as ambassadorFirstName',
      'admins.lastName as ambassadorLastName',
      'onboardingSessions.date',
      'onboardingSessions.group',
      'onboardingSessions.id',
      attendeesAggregation,
    ])
    .groupBy(['onboardingSessions.id', 'admins.firstName', 'admins.lastName'])
    .orderBy('onboardingSessions.date', 'desc')
    .orderBy('onboardingSessions.group', 'desc')
    .limit(limit)
    .offset((page - 1) * limit)
    .execute();

  const sessions = rows.map((row) => {
    return {
      ...row,
      date: dayjs(row.date).format('MM/DD/YY'),
      ambassadorName:
        row.ambassadorFirstName && row.ambassadorLastName
          ? `${row.ambassadorFirstName} ${row.ambassadorLastName}`
          : '',
    };
  });

  return sessions;
}

async function countOnboardingSessions() {
  const { count } = await db
    .selectFrom('onboardingSessions')
    .select((eb) => eb.fn.countAll<number>().as('count'))
    .executeTakeFirstOrThrow();

  return count;
}

export default function OnboardingSessionsPage() {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Dashboard.Title>Onboarding Sessions</Dashboard.Title>
        <UploadOnboardingSessionButton />
      </div>

      <OnboardingSessionsTable />
      <OnboardingSessionsPagination />
      <Outlet />
    </>
  );
}

function UploadOnboardingSessionButton() {
  return (
    <Button.Slot variant="primary">
      <Link to={Route['/onboarding-sessions/upload']}>
        <Plus size={16} /> Upload Session
      </Link>
    </Button.Slot>
  );
}

type OnboardingSessionInView = SerializeFrom<typeof loader>['sessions'][number];

function OnboardingSessionsTable() {
  const { sessions } = useLoaderData<typeof loader>();

  const columns: TableColumnProps<OnboardingSessionInView>[] = [
    {
      displayName: 'Session Date',
      size: '160',
      render: (session) => session.date,
    },
    {
      displayName: 'Session No.',
      size: '120',
      render: (session) => {
        const color = ACCENT_COLORS[session.group % ACCENT_COLORS.length];

        return <Pill color={color as PillProps['color']}>{session.group}</Pill>;
      },
    },
    {
      displayName: 'Attendees',
      render: (session) => session.attendees,
      size: '800',
    },
    {
      displayName: 'Uploaded By',
      render: (session) => session.ambassadorName,
      size: '200',
    },
    {
      size: '48',
      sticky: true,
      render: (session) => <OnboardingSessionsDropdown {...session} />,
    },
  ];

  return (
    <Table
      columns={columns}
      data={sessions}
      emptyMessage="No onboarding sessions found."
    />
  );
}

function OnboardingSessionsPagination() {
  const { sessions, totalCount } = useLoaderData<typeof loader>();

  const [searchParams] = useSearchParams(OnboardingSessionsSearchParams);

  return (
    <Pagination
      dataLength={sessions.length}
      page={searchParams.page}
      pageSize={searchParams.limit}
      totalCount={totalCount}
    />
  );
}

function OnboardingSessionsDropdown({ id }: OnboardingSessionInView) {
  const [open, setOpen] = useState<boolean>(false);

  function onClose() {
    setOpen(false);
  }

  function onOpen() {
    setOpen(true);
  }

  return (
    <Dropdown.Container onClose={onClose}>
      {open && (
        <Table.Dropdown>
          <Dropdown.List>
            <Dropdown.Item>
              <Link
                to={generatePath(
                  Route['/onboarding-sessions/:id/add-attendees'],
                  {
                    id,
                  }
                )}
              >
                <Plus /> Add Attendees
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Table.Dropdown>
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
    </Dropdown.Container>
  );
}
