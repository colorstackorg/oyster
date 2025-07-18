import { Edit, Plus, Trash } from 'react-feather';
import {
  generatePath,
  Link,
  type LoaderFunctionArgs,
  Outlet,
  useLoaderData,
} from 'react-router';

import { listFeatureFlags } from '@oyster/core/admin-dashboard/server';
import {
  Button,
  Dashboard,
  Dropdown,
  Pill,
  type SerializeFrom,
  Table,
  type TableColumnProps,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const flags = await listFeatureFlags();

  return {
    flags,
  };
}

export default function FeatureFlagsPage() {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <Dashboard.Title>Feature Flags</Dashboard.Title>

        <Button.Slot>
          <Link to={Route['/feature-flags/create']}>
            <Plus size={16} /> Create Flag
          </Link>
        </Button.Slot>
      </div>

      <FeatureFlagsTable />
      <Outlet />
    </>
  );
}

type FeatureFlagInView = SerializeFrom<typeof loader>['flags'][number];

function FeatureFlagsTable() {
  const { flags } = useLoaderData<typeof loader>();

  const columns: TableColumnProps<FeatureFlagInView>[] = [
    {
      displayName: 'Status',
      size: '120',
      render: (flag) => {
        return flag.enabled ? (
          <Pill color="lime-100">Enabled</Pill>
        ) : (
          <Pill color="red-100">Disabled</Pill>
        );
      },
    },
    {
      displayName: 'Name',
      size: '200',
      render: (flag) => {
        return (
          // TODO: Move styling to design system.
          <code className="rounded-md border border-gray-200 bg-gray-50 px-1 py-0.5 text-sm text-gray-400">
            {flag.name}
          </code>
        );
      },
    },
    {
      displayName: 'Display Name',
      size: '200',
      render: (flag) => flag.displayName,
    },
    {
      displayName: 'Description',
      size: '800',
      render: (flag) => flag.description,
    },
    {
      size: '48',
      sticky: true,
      render: (flag) => <FeatureFlagsTableDropdown {...flag} />,
    },
  ];

  return (
    <Table
      columns={columns}
      data={flags}
      emptyMessage="No feature flags found."
    />
  );
}

function FeatureFlagsTableDropdown({ id }: FeatureFlagInView) {
  return (
    <Dropdown.Root>
      <Table.Dropdown>
        <Dropdown.List>
          <Dropdown.Item>
            <Link
              preventScrollReset
              to={generatePath(Route['/feature-flags/:id/edit'], { id })}
            >
              <Edit /> Edit Flag
            </Link>
          </Dropdown.Item>
          <Dropdown.Item>
            <Link
              preventScrollReset
              to={generatePath(Route['/feature-flags/:id/delete'], { id })}
            >
              <Trash /> Delete Flag
            </Link>
          </Dropdown.Item>
        </Dropdown.List>
      </Table.Dropdown>

      <Table.DropdownOpenButton />
    </Dropdown.Root>
  );
}
