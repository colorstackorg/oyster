import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { Edit, Plus } from 'react-feather';
import { generatePath } from 'react-router';

import {
  Dashboard,
  Dropdown,
  getButtonCn,
  Table,
  type TableColumnProps,
} from '@oyster/ui';

import { Route } from '../shared/constants';
import { listFeatureFlags } from '../shared/core.server';
import { ensureUserAuthenticated } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    allowAmbassador: true,
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
      displayName: 'Code',
      size: '400',
      render: (flag) => flag.code,
    },
    {
      displayName: 'Name',
      size: '200',
      render: (flag) => flag.name,
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
              <Link
                to={generatePath(Route['/feature-flags/:id/edit'], {
                  id: id.toString(),
                })}
              >
                <Edit /> Edit Feature Flag
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Table.Dropdown>
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
    </Dropdown.Container>
  );
}
