import dayjs from 'dayjs';
import { sql } from 'kysely';
import { CornerUpLeft, Edit, ExternalLink, Star, Trash } from 'react-feather';
import {
  generatePath,
  Link,
  type LoaderFunctionArgs,
  Outlet,
  useLoaderData,
} from 'react-router';

import { ListSearchParams } from '@oyster/core/admin-dashboard/ui';
import { db } from '@oyster/db';
import {
  Dashboard,
  Dropdown,
  Pagination,
  type SerializeFrom,
  Table,
  type TableColumnProps,
  useSearchParams,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ENV } from '@/shared/constants.server';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const searchParams = ListSearchParams.parse({
    ...Object.fromEntries(url.searchParams),
    timezone: getTimezone(request),
  });

  const { students, totalCount } = await listStudents(searchParams);

  return {
    students,
    totalCount,
  };
}

async function listStudents({
  limit,
  page,
  search,
  timezone,
}: ListSearchParams) {
  let query = db.selectFrom('students');

  if (search) {
    query = query.where((eb) =>
      eb.or([
        eb('email', 'ilike', `%${search}%`),
        eb('firstName', 'ilike', `%${search}%`),
        eb('lastName', 'ilike', `%${search}%`),
        eb(sql`first_name || ' ' || last_name`, 'ilike', `%${search}%`),
      ])
    );
  }

  const [rows, { count }] = await Promise.all([
    query
      .leftJoin('schools', 'schools.id', 'students.schoolId')
      .select([
        'students.airtableId',
        'students.applicationId',
        'students.email',
        'students.firstName',
        'students.id',
        'students.lastName',
        'students.otherSchool',
        'schools.name as schoolName',
        (eb) => {
          return eb.fn
            .coalesce('students.acceptedAt', 'students.createdAt')
            .as('joinedAt');
        },
      ])
      .orderBy('students.acceptedAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),

    query
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  const students = rows.map(
    ({ airtableId, applicationId, joinedAt, ...row }) => {
      return {
        ...row,
        ...(applicationId && {
          applicationUri: `/applications/${applicationId}`,
        }),
        airtableUri: `https://airtable.com/${ENV.AIRTABLE_FAMILY_BASE_ID}/${ENV.AIRTABLE_MEMBERS_TABLE_ID}/${airtableId}`,
        directoryUri: `${ENV.STUDENT_PROFILE_URL}/directory/${row.id}`,
        joinedAt: dayjs(joinedAt).tz(timezone).format('MM/DD/YY @ h:mm A'),
      };
    }
  );

  return {
    students,
    totalCount: Number(count),
  };
}

export default function StudentsPage() {
  return (
    <>
      <Dashboard.Title>Students</Dashboard.Title>

      <Dashboard.Subheader>
        <Dashboard.SearchForm placeholder="Search by name..." />
      </Dashboard.Subheader>

      <StudentsTable />
      <StudentsPagination />
      <Outlet />
    </>
  );
}

type StudentInView = SerializeFrom<typeof loader>['students'][number];

function StudentsTable() {
  const { students } = useLoaderData<typeof loader>();

  const columns: TableColumnProps<StudentInView>[] = [
    {
      displayName: 'Full Name',
      render: (student) => {
        return (
          <Link className="link" target="_blank" to={student.directoryUri}>
            {student.firstName} {student.lastName}
          </Link>
        );
      },
      size: '240',
    },
    {
      displayName: 'Email',
      size: '320',
      render: (student) => student.email,
    },
    {
      displayName: 'School',
      size: '360',
      render: (student) => student.schoolName || student.otherSchool || '-',
    },
    {
      displayName: 'Joined On',
      size: '240',
      render: (student) => student.joinedAt,
    },
    {
      size: '48',
      sticky: true,
      render: (student) => <StudentDropdown {...student} />,
    },
  ];

  return (
    <Table
      columns={columns}
      data={students}
      emptyMessage="No students found."
    />
  );
}

function StudentsPagination() {
  const [searchParams] = useSearchParams(ListSearchParams);

  const { students, totalCount } = useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={students.length}
      page={searchParams.page}
      pageSize={searchParams.limit}
      totalCount={totalCount}
    />
  );
}

function StudentDropdown({ airtableUri, applicationUri, id }: StudentInView) {
  return (
    <Dropdown.Root>
      <Table.Dropdown>
        <Dropdown.List>
          <Dropdown.Item>
            <Link
              preventScrollReset
              to={generatePath(Route['/students/:id/points/grant'], { id })}
            >
              <Star /> Grant Points
            </Link>
          </Dropdown.Item>

          <Dropdown.Item>
            <Link
              preventScrollReset
              to={generatePath(Route['/students/:id/email'], { id })}
            >
              <Edit /> Update Email
            </Link>
          </Dropdown.Item>

          {applicationUri && (
            <Dropdown.Item>
              <Link preventScrollReset target="_blank" to={applicationUri}>
                <CornerUpLeft /> View Application
              </Link>
            </Dropdown.Item>
          )}

          <Dropdown.Item>
            <Link
              preventScrollReset
              target="_blank"
              to={airtableUri}
              rel="noopener noreferrer"
            >
              <ExternalLink /> View Airtable Record
            </Link>
          </Dropdown.Item>

          <Dropdown.Item>
            <Link
              preventScrollReset
              to={generatePath(Route['/students/:id/remove'], { id })}
            >
              <Trash /> Remove Member
            </Link>
          </Dropdown.Item>
        </Dropdown.List>
      </Table.Dropdown>

      <Table.DropdownOpenButton />
    </Dropdown.Root>
  );
}
