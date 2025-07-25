import dayjs from 'dayjs';
import { Clipboard, Edit, ExternalLink, Menu, Plus } from 'react-feather';
import {
  generatePath,
  Link,
  type LoaderFunctionArgs,
  Outlet,
  useLoaderData,
} from 'react-router';

import { listResumeBooks } from '@oyster/core/resume-books';
import {
  Dashboard,
  Dropdown,
  IconButton,
  Pill,
  type SerializeFrom,
  Table,
  type TableColumnProps,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ENV } from '@/shared/constants.server';
import { getTimezone } from '@/shared/cookies.server';
import { useToast } from '@/shared/hooks';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const timezone = getTimezone(request);

  const _resumeBooks = await listResumeBooks({
    select: [
      'airtableBaseId',
      'airtableTableId',
      'endDate',
      'googleDriveFolderId',
      'hidden',
      'id',
      'name',
      'startDate',
      (eb) => {
        return eb
          .selectFrom('resumeBookSubmissions')
          .select((eb) => eb.fn.countAll().as('submissions'))
          .whereRef('resumeBooks.id', '=', 'resumeBookSubmissions.resumeBookId')
          .as('submissions');
      },
    ],
  });

  const resumeBooks = _resumeBooks.map(
    ({
      airtableBaseId,
      airtableTableId,
      endDate,
      googleDriveFolderId,
      startDate,
      ...record
    }) => {
      const format = 'MM/DD/YY @ h:mm A (z)';

      return {
        ...record,
        airtableUri: `https://airtable.com/${airtableBaseId}/${airtableTableId}`,
        endDate: dayjs(endDate).tz(timezone).format(format),
        googleDriveUri: `https://drive.google.com/drive/folders/${googleDriveFolderId}`,
        resumeBookUri: `${ENV.STUDENT_PROFILE_URL}/resume-books/${record.id}`,
        startDate: dayjs(startDate).tz(timezone).format(format),
      };
    }
  );

  return {
    resumeBooks,
  };
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
  return (
    <Dropdown.Root>
      <Dropdown.Trigger>
        <IconButton
          backgroundColor="gray-100"
          backgroundColorOnHover="gray-200"
          icon={<Menu />}
          shape="square"
        />
      </Dropdown.Trigger>

      <Dropdown>
        <Dropdown.List>
          <Dropdown.Item>
            <Link to={Route['/resume-books/create']}>
              <Plus /> Create Resume Book
            </Link>
          </Dropdown.Item>
        </Dropdown.List>
      </Dropdown>
    </Dropdown.Root>
  );
}

type ResumeBookInView = SerializeFrom<typeof loader>['resumeBooks'][number];

function ResumeBooksTable() {
  const { resumeBooks } = useLoaderData<typeof loader>();

  const columns: TableColumnProps<ResumeBookInView>[] = [
    {
      displayName: 'Name',
      size: '240',
      render: (resumeBook) => resumeBook.name,
    },
    {
      displayName: '# of Submissions',
      size: '160',
      render: (resumeBook) => Number(resumeBook.submissions),
    },
    {
      displayName: 'Start Date',
      size: '240',
      render: (resumeBook) => resumeBook.startDate,
    },
    {
      displayName: 'End Date',
      size: '240',
      render: (resumeBook) => resumeBook.endDate,
    },
    {
      displayName: 'Visibility',
      size: '160',
      render: (resumeBook) => {
        return resumeBook.hidden ? (
          <Pill color="amber-100">Hidden</Pill>
        ) : (
          <Pill color="orange-100">Visible</Pill>
        );
      },
    },
    {
      size: '48',
      sticky: true,
      render: (resumeBook) => <ResumeBookDropdown {...resumeBook} />,
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

function ResumeBookDropdown({
  airtableUri,
  googleDriveUri,
  id,
  resumeBookUri,
}: ResumeBookInView) {
  const toast = useToast();

  return (
    <Dropdown.Root>
      <Table.Dropdown>
        <Dropdown.List>
          <Dropdown.Item>
            <Link
              preventScrollReset
              to={generatePath(Route['/resume-books/:id/edit'], { id })}
            >
              <Edit /> Edit Resume Book
            </Link>
          </Dropdown.Item>

          <Dropdown.Item>
            <button
              onClick={() => {
                navigator.clipboard.writeText(resumeBookUri);
                toast({ message: 'Copied URL to clipboard!' });
              }}
              type="button"
            >
              <Clipboard /> Copy Resume Book URL
            </button>
          </Dropdown.Item>

          <Dropdown.Item>
            <Link preventScrollReset to={airtableUri} target="_blank">
              <ExternalLink /> Go to Airtable
            </Link>
          </Dropdown.Item>

          <Dropdown.Item>
            <Link preventScrollReset to={googleDriveUri} target="_blank">
              <ExternalLink /> Go to Google Drive
            </Link>
          </Dropdown.Item>
        </Dropdown.List>
      </Table.Dropdown>

      <Table.DropdownOpenButton />
    </Dropdown.Root>
  );
}
