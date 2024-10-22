import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { Edit, Menu, Plus, Trash } from 'react-feather';
import { generatePath } from 'react-router';

import { listActivities } from '@oyster/core/gamification';
import {
  Dashboard,
  Dropdown,
  IconButton,
  Pill,
  Table,
  type TableColumnProps,
} from '@oyster/ui';
import { toTitleCase } from '@oyster/utils';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const activities = await listActivities();

  return json({
    activities,
  });
}

export default function GamificationPage() {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Dashboard.Title>Activities</Dashboard.Title>
        <ActivitiesDropdown />
      </div>

      <ActivitiesTable />
      <Outlet />
    </>
  );
}

function ActivitiesDropdown() {
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
              <Link to={Route['/gamification/activities/add']}>
                <Plus /> Add Activity
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Dropdown>
      )}
    </Dropdown.Container>
  );
}

type ActivityInView = SerializeFrom<typeof loader>['activities'][number];

function ActivitiesTable() {
  const { activities } = useLoaderData<typeof loader>();

  const columns: TableColumnProps<ActivityInView>[] = [
    {
      displayName: 'Name',
      size: '240',
      render: (activity) => activity.name,
    },
    {
      displayName: 'Points',
      size: '160',
      render: (activity) => {
        return <span className="text-green-700">+{activity.points}</span>;
      },
    },
    {
      displayName: 'Period',
      size: '160',
      render: (activity) => {
        if (!activity.period) {
          return <span>None</span>;
        }

        return <Pill color="amber-100">{toTitleCase(activity.period)}</Pill>;
      },
    },
    {
      displayName: 'Description',
      size: '400',
      render: (activity) => activity.description,
    },
    {
      size: '48',
      sticky: true,
      render: ActivitiesTableDropdown,
    },
  ];

  return (
    <Table
      columns={columns}
      data={activities}
      emptyMessage="No activities found."
    />
  );
}

function ActivitiesTableDropdown({ id }: ActivityInView) {
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
                to={generatePath(Route['/gamification/activities/:id/edit'], {
                  id,
                })}
              >
                <Edit /> Edit Activity
              </Link>
            </Dropdown.Item>

            <Dropdown.Item>
              <Link
                to={generatePath(
                  Route['/gamification/activities/:id/archive'],
                  { id }
                )}
              >
                <Trash /> Archive Activity
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Table.Dropdown>
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
    </Dropdown.Container>
  );
}

export function ErrorBoundary() {
  return <></>;
}
