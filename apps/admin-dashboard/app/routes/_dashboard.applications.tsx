import { type LoaderFunctionArgs, type SerializeFrom } from '@remix-run/node';
import {
  Form,
  Link,
  Outlet,
  useLoaderData,
  useLocation,
  useSubmit,
} from '@remix-run/react';
import { Edit } from 'react-feather';
import { generatePath } from 'react-router';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { ListSearchParams } from '@oyster/core/admin-dashboard/ui';
import { listApplications } from '@oyster/core/applications';
import { type ApplicationRejectionReason } from '@oyster/core/applications/types';
import { ApplicationStatus } from '@oyster/core/applications/ui';
import { Application } from '@oyster/types';
import {
  type AccentColor,
  Dashboard,
  Dropdown,
  Pagination,
  Pill,
  type PillProps,
  SearchBar,
  Select,
  Table,
  type TableColumnProps,
  useSearchParams,
} from '@oyster/ui';
import { toTitleCase } from '@oyster/utils';

import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated } from '@/shared/session.server';

const ApplicationsSearchParams = ListSearchParams.extend({
  status: Application.shape.status.or(z.literal('all')).catch('pending'),
});

type ApplicationsSearchParams = z.infer<typeof ApplicationsSearchParams>;

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'ambassador',
  });

  const url = new URL(request.url);

  const searchParams = ApplicationsSearchParams.parse({
    ...Object.fromEntries(url.searchParams),
    timezone: getTimezone(request),
  });

  const { applications, totalCount } = await listApplications(searchParams);

  return {
    applications,
    status: searchParams.status,
    totalCount,
  };
}

export default function ApplicationsPage() {
  return (
    <>
      <Dashboard.Title>Applications</Dashboard.Title>

      <Dashboard.Subheader>
        <FilterApplicationsForm />
      </Dashboard.Subheader>

      <ApplicationsTable />
      <ApplicationsPagination />
      <Outlet />
    </>
  );
}

const keys = ApplicationsSearchParams.keyof().enum;

const statuses = Object.values(ApplicationStatus);

function FilterApplicationsForm() {
  const submit = useSubmit();

  const [searchParams] = useSearchParams(ApplicationsSearchParams);

  return (
    <Form
      className="flex w-full items-center"
      method="get"
      onChange={(e) => submit(e.currentTarget)}
    >
      <SearchBar
        defaultValue={searchParams.search}
        name={keys.search}
        id={keys.search}
        placeholder="Search by email or name..."
      />

      <div className="ml-auto w-32">
        <Select
          defaultValue={searchParams.status}
          id={keys.status}
          name={keys.status}
          placeholder="Status..."
          required
        >
          <option value="all">All</option>

          {statuses.map((status) => {
            return (
              <option key={status} value={status}>
                {toTitleCase(status)}
              </option>
            );
          })}
        </Select>
      </div>
    </Form>
  );
}

type ApplicationInView = SerializeFrom<typeof loader>['applications'][number];

function ApplicationsTable() {
  const { applications, status } = useLoaderData<typeof loader>();

  const { search } = useLocation();

  const columns: TableColumnProps<ApplicationInView>[] = [
    {
      displayName: 'Full Name',
      render: (application) => {
        return (
          <Link
            className="link"
            to={{
              pathname: generatePath(Route['/applications/:id'], {
                id: application.id,
              }),
              search,
            }}
          >
            {application.firstName} {application.lastName}
          </Link>
        );
      },
      size: '240',
    },
    {
      displayName: 'Email',
      size: '320',
      render: (application) => application.email,
    },
    {
      displayName: 'Status',
      render: (application) => {
        const StatusColor: Record<ApplicationStatus, AccentColor> = {
          accepted: 'lime-100',
          pending: 'amber-100',
          rejected: 'red-100',
        };

        const color = StatusColor[application.status as ApplicationStatus];

        return (
          <Pill color={color as PillProps['color']}>
            {toTitleCase(application.status)}
          </Pill>
        );
      },
      size: '160',
    },
    {
      displayName: 'Rejection Reason',
      render: (application) => {
        return match(application.rejectionReason as ApplicationRejectionReason)
          .with('bad_linkedin', () => 'Incorrect or suspicious LinkedIn')
          .with('email_already_used', () => 'Email already used')
          .with('email_bounced', () => 'Email bounced')
          .with('ineligible_major', () => 'Not the right major')
          .with('is_international', () => 'Not enrolled in US or Canada')
          .with('not_undergraduate', () => 'Not an undergrad student')
          .with('other', () => 'Other')
          .otherwise(() => '-');
      },
      size: '400',
      show: () => {
        return status === 'all' || status === 'rejected';
      },
    },
    {
      displayName: 'Applied On',
      size: '240',
      render: (application) => application.createdAt,
    },
    {
      displayName: 'Reviewed By',
      size: '280',
      render: (application) => {
        const { reviewedByFirstName, reviewedByLastName } = application;

        if (!reviewedByFirstName) {
          return '-';
        }

        return `${reviewedByFirstName} ${reviewedByLastName}`;
      },
    },
    {
      show: () => ['pending', 'rejected'].includes(status),
      size: '48',
      sticky: true,
      render: (application) => <ApplicationDropdown {...application} />,
    },
  ];

  return (
    <Table
      columns={columns}
      data={applications}
      emptyMessage="No pending applications left to review."
    />
  );
}

function ApplicationsPagination() {
  const { applications, totalCount } = useLoaderData<typeof loader>();

  const [searchParams] = useSearchParams(ApplicationsSearchParams);

  return (
    <Pagination
      dataLength={applications.length}
      page={searchParams.page}
      pageSize={searchParams.limit}
      totalCount={totalCount}
    />
  );
}

function ApplicationDropdown({ id }: ApplicationInView) {
  const { search } = useLocation();

  const [searchParams] = useSearchParams(ApplicationsSearchParams);

  return (
    <Dropdown.Root>
      <Table.Dropdown>
        <Dropdown.List>
          {searchParams.status === 'pending' && (
            <Dropdown.Item>
              <Link
                preventScrollReset
                to={{
                  pathname: generatePath(Route['/applications/:id/email'], {
                    id,
                  }),
                  search,
                }}
              >
                <Edit /> Update Email
              </Link>
            </Dropdown.Item>
          )}
          {searchParams.status === 'rejected' && (
            <Dropdown.Item>
              <Link
                preventScrollReset
                to={{
                  pathname: generatePath(Route['/applications/:id/accept'], {
                    id,
                  }),
                  search,
                }}
              >
                <Edit /> Accept Application
              </Link>
            </Dropdown.Item>
          )}
        </Dropdown.List>
      </Table.Dropdown>

      <Table.DropdownOpenButton />
    </Dropdown.Root>
  );
}
