import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  SerializeFrom,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { sql } from 'kysely';
import { useState } from 'react';
import { Edit, Menu, Plus } from 'react-feather';
import { generatePath } from 'react-router';

import {
  Dropdown,
  IconButton,
  Pagination,
  Table,
  TableColumnProps,
  useSearchParams,
} from '@colorstack/core-ui';
import { Dashboard } from '@colorstack/feature-ui';

import { Route } from '../shared/constants';
import { db } from '../shared/core.server';
import { ListSearchParams } from '../shared/core.ui';
import { ensureUserAuthenticated } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    allowAmbassador: true,
  });

  const url = new URL(request.url);

  const searchParams = ListSearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  const { schools, totalSchools } = await listSchools(searchParams);

  return json({
    schools,
    totalSchools,
  });
}

async function listSchools({ limit, page, search }: ListSearchParams) {
  let query = db.selectFrom('schools');

  if (search) {
    query = query
      .where(sql`similarity(name, ${search}) > 0.15`)
      .where(sql`word_similarity(name, ${search}) > 0.15`);
  }

  const [rows, countResult] = await Promise.all([
    query
      .select([
        'addressCity',
        'addressState',
        'id',
        'name',
        (eb) => {
          return eb
            .selectFrom('students')
            .select(eb.fn.countAll<string>().as('count'))
            .whereRef('students.schoolId', '=', 'schools.id')
            .as('students');
        },
      ])
      .$if(!search, (qb) => {
        return qb.orderBy('students', 'desc');
      })
      .$if(!!search, (qb) => {
        return qb.orderBy(sql`similarity(name, ${search})`, 'desc');
      })
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),

    query
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  return {
    schools: rows,
    totalSchools: parseInt(countResult.count),
  };
}

export async function action({ request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export default function SchoolsPage() {
  return (
    <>
      <Dashboard.Title>Schools</Dashboard.Title>

      <Dashboard.Subheader>
        <Dashboard.SearchForm placeholder="Search..." />
        <SchoolsActionDropdown />
      </Dashboard.Subheader>

      <SchoolsTable />
      <SchoolsPagination />
      <Outlet />
    </>
  );
}

function SchoolsActionDropdown() {
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
        icon={<Menu />}
        onClick={onClick}
        shape="square"
      />

      {open && (
        <Dropdown>
          <Dropdown.List>
            <Dropdown.Item>
              <Link to={Route.CREATE_SCHOOL}>
                <Plus /> Create School
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Dropdown>
      )}
    </Dropdown.Container>
  );
}

type SchoolInView = SerializeFrom<typeof loader>['schools'][number];

function SchoolsTable() {
  const { schools } = useLoaderData<typeof loader>();

  const columns: TableColumnProps<SchoolInView>[] = [
    {
      displayName: 'Name',
      size: '400',
      render: (school) => school.name,
    },
    {
      displayName: 'Location',
      size: '200',
      render: (school) => `${school.addressCity}, ${school.addressState}`,
    },
    {
      displayName: '# of Students',
      render: (school) => school.students,
      size: null,
    },
  ];

  return (
    <Table
      columns={columns}
      data={schools}
      Dropdown={SchoolsTableDropdown}
      emptyMessage="No schools found."
    />
  );
}

function SchoolsPagination() {
  const [searchParams] = useSearchParams(ListSearchParams);

  const { schools, totalSchools } = useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={schools.length}
      page={searchParams.page}
      pageSize={searchParams.limit}
      totalCount={totalSchools}
    />
  );
}

function SchoolsTableDropdown({ id }: SchoolInView) {
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
              <Link to={generatePath(Route.EDIT_SCHOOL, { id })}>
                <Edit /> Edit School
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Table.Dropdown>
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
    </Dropdown.Container>
  );
}
