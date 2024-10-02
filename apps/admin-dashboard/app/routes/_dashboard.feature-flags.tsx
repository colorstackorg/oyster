import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { Edit, Plus, Trash } from 'react-feather';
import { generatePath } from 'react-router';

import { listFeatureFlags } from '@oyster/core/admin-dashboard/server';
import {
  Dashboard,
  Dropdown,
  getButtonCn,
  Pill,
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

  return json({
    flags,
  });
}

export default function FeatureFlagsPage() {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <Dashboard.Title>Feature Flags</Dashboard.Title>

        <Link className={getButtonCn({})} to={Route['/feature-flags/create']}>
          <Plus size={16} /> Create Flag
        </Link>
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
  ];

  return (
    <Table
      columns={columns}
      data={flags}
      Dropdown={FeatureFlagsTableDropdown}
      emptyMessage="No feature flags found."
    />
  );
}

function FeatureFlagsTableDropdown({ id }: FeatureFlagInView) {
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
              <Link to={generatePath(Route['/feature-flags/:id/edit'], { id })}>
                <Edit /> Edit Flag
              </Link>
            </Dropdown.Item>
            <Dropdown.Item>
              <Link
                to={generatePath(Route['/feature-flags/:id/delete'], { id })}
              >
                <Trash /> Delete Flag
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Table.Dropdown>
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
    </Dropdown.Container>
  );
}
