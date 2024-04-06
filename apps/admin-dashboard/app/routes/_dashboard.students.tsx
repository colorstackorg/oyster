import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { sql } from 'kysely';
import { useState } from 'react';
import {
  DollarSign,
  Edit,
  Gift,
  Hash,
  Trash,
  Upload,
  Users,
  Zap,
} from 'react-feather';
import { generatePath } from 'react-router';

import {
  Dashboard,
  Dropdown,
  IconButton,
  Pagination,
  Table,
  type TableColumnProps,
  useSearchParams,
} from '@oyster/ui';

import { Route } from '../shared/constants';
import { getTimezone } from '../shared/cookies.server';
import { db } from '../shared/core.server';
import { ListSearchParams } from '../shared/core.ui';
import { ensureUserAuthenticated } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const searchParams = ListSearchParams.parse({
    ...Object.fromEntries(url.searchParams),
    timezone: getTimezone(request),
  });

  const { students, totalCount } = await listStudents(searchParams);

  return json({
    students,
    totalCount,
  });
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
        'students.activatedAt',
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

  const students = rows.map((row) => {
    return {
      ...row,
      joinedAt: dayjs(row.joinedAt).tz(timezone).format('MM/DD/YY @ h:mm A'),
    };
  });

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

        <div className="ml-auto flex items-center gap-2">
          <StudentsUploadDropdown />
        </div>
      </Dashboard.Subheader>

      <StudentsTable />
      <StudentsPagination />
      <Outlet />
    </>
  );
}

function StudentsUploadDropdown() {
  const [open, setOpen] = useState<boolean>(false);

  function onClose() {
    setOpen(false);
  }

  function onClick() {
    setOpen(true);
  }

  return (
    <Dropdown.Container onClose={onClose}>
      <IconButton
        backgroundColor="gray-100"
        backgroundColorOnHover="gray-200"
        icon={<Upload />}
        onClick={onClick}
        shape="square"
      />

      {open && (
        <Dropdown>
          <Dropdown.List>
            <Dropdown.Item>
              <Link to={Route.STUDENTS_IMPORT_RESOURCES}>
                <Hash /> Import Resource Users
              </Link>
            </Dropdown.Item>

            <Dropdown.Item>
              <Link to={Route.STUDENTS_IMPORT_PROGRAMS}>
                <Users /> Import Program Participants
              </Link>
            </Dropdown.Item>

            <Dropdown.Item>
              <Link to={Route.STUDENTS_IMPORT_SCHOLARSHIPS}>
                <DollarSign /> Import Scholarship Recipients
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Dropdown>
      )}
    </Dropdown.Container>
  );
}

type StudentInView = SerializeFrom<typeof loader>['students'][number];

function StudentsTable() {
  const { students } = useLoaderData<typeof loader>();

  const columns: TableColumnProps<StudentInView>[] = [
    {
      displayName: 'First Name',
      size: '200',
      render: (student) => student.firstName,
    },
    {
      displayName: 'Last Name',
      size: '200',
      render: (student) => student.lastName,
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
  ];

  return (
    <Table
      columns={columns}
      data={students}
      Dropdown={StudentDropdown}
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

function StudentDropdown({ activatedAt, id }: StudentInView) {
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
            {!activatedAt && (
              <Dropdown.Item>
                <Link to={generatePath(Route.ACTIVATE_STUDENT, { id })}>
                  <Zap /> Activate Member
                </Link>
              </Dropdown.Item>
            )}

            <Dropdown.Item>
              <Link to={generatePath(Route.GRANT_POINTS, { id })}>
                <Gift /> Grant Points
              </Link>
            </Dropdown.Item>

            <Dropdown.Item>
              <Link to={generatePath(Route.UPDATE_STUDENT_EMAIL, { id })}>
                <Edit /> Update Email
              </Link>
            </Dropdown.Item>

            <Dropdown.Item>
              <Link to={generatePath(Route.REMOVE_STUDENT, { id })}>
                <Trash /> Delete Member
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Table.Dropdown>
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
    </Dropdown.Container>
  );
}
