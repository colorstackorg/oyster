import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  Link,
  Outlet,
  Form as RemixForm,
  useLoaderData,
  useLocation,
  useSubmit,
} from '@remix-run/react';
import { useState } from 'react';
import { Edit } from 'react-feather';
import { generatePath } from 'react-router';
import { z } from 'zod';

import { ListSearchParams } from '@oyster/core/admin-dashboard/ui';
import { listApplications } from '@oyster/core/applications';
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

  console.log(applications);

  return json({
    applications,
    totalCount,
  });
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
    <RemixForm
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
    </RemixForm>
  );
}

type ApplicationInView = SerializeFrom<typeof loader>['applications'][number];

function ApplicationsTable() {
  const { applications } = useLoaderData<typeof loader>();

  const { search } = useLocation();

  const [searchParams] = useSearchParams(ApplicationsSearchParams);

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
    // TODO: Show the "Rejection Reason" in the "Applications" table in the Admin Dashboard. Note that this should only be in the "Rejected" and "All" views.
    // Have to add a column of the rejection reason in the database
    {
      displayName: 'Rejection Reason',
      render: (application) => application.rejectionReason || '-',
      size: '400',
      show: () =>
        searchParams.status === 'rejected' || searchParams.status === 'all',
    },
  ];

  return (
    <Table
      columns={columns}
      data={applications}
      emptyMessage="No pending applications left to review."
      {...(['pending', 'rejected'].includes(searchParams.status) && {
        Dropdown: ApplicationDropdown,
      })}
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
  const [open, setOpen] = useState<boolean>(false);

  const { search } = useLocation();

  const [searchParams] = useSearchParams(ApplicationsSearchParams);

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
            {searchParams.status === 'pending' && (
              <Dropdown.Item>
                <Link
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
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
    </Dropdown.Container>
  );
}
