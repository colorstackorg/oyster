import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Menu, Plus } from 'react-feather';

import { db } from '@oyster/db';
import {
  Dashboard,
  Dropdown,
  IconButton,
  Table,
  type TableColumnProps,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const timezone = getTimezone(request);

  const records = await db
    .selectFrom('resumeBooks')
    .select([
      'airtableBaseId',
      'airtableTableId',
      'endDate',
      'id',
      'name',
      'startDate',
    ])
    .orderBy('startDate', 'desc')
    .execute();

  const resumeBooks = records.map(
    ({ airtableBaseId, airtableTableId, endDate, startDate, ...record }) => {
      const format = 'MM/DD/YY @ h:mm A';

      return {
        ...record,
        airtableUri: `https://airtable.com/${airtableBaseId}/${airtableTableId}`,
        endDate: dayjs(endDate).tz(timezone).format(format),
        startDate: dayjs(startDate).tz(timezone).format(format),
      };
    }
  );

  return json({
    resumeBooks,
  });
}

export default function ResumeBooksPage() {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <Dashboard.Title>Resume Books</Dashboard.Title>

        <ResumeBooksMenuDropdown />
      </div>

      <ResumeBooksTable />
      <Outlet />
    </>
  );
}

function ResumeBooksMenuDropdown() {
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
              <Link to={Route['/resume-books/create']}>
                <Plus /> Create Resume Book
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Dropdown>
      )}
    </Dropdown.Container>
  );
}

type ResumeBookInView = SerializeFrom<typeof loader>['resumeBooks'][number];

function ResumeBooksTable() {
  const { resumeBooks } = useLoaderData<typeof loader>();

  const columns: TableColumnProps<ResumeBookInView>[] = [
    {
      displayName: 'Name',
      size: '160',
      render: (resumeBook) => resumeBook.name,
    },
    {
      displayName: 'Start Date',
      size: '200',
      render: (resumeBook) => resumeBook.startDate,
    },
    {
      displayName: 'End Date',
      size: '200',
      render: (resumeBook) => resumeBook.endDate,
    },
    {
      displayName: 'Airtable Link',
      size: null,
      render: (resumeBook) => {
        return (
          <Link className="link" to={resumeBook.airtableUri} target="_blank">
            {resumeBook.airtableUri}
          </Link>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      data={resumeBooks}
      emptyMessage="No resume books found."
    />
  );
}
