import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';

import { Dashboard, Pill, Table, type TableColumnProps } from '@oyster/ui';

import { listAdmins } from '@/admin-dashboard.server';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const admins = await listAdmins();

  return json({
    admins,
  });
}

export default function AdminsPage() {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <Dashboard.Title>Admins</Dashboard.Title>
      </div>

      <AdminsTable />
      <Outlet />
    </>
  );
}

type AdminInView = SerializeFrom<typeof loader>['admins'][number];

function AdminsTable() {
  const { admins } = useLoaderData<typeof loader>();

  const columns: TableColumnProps<AdminInView>[] = [
    {
      displayName: 'First Name',
      size: '200',
      render: (admin) => admin.firstName,
    },
    {
      displayName: 'Last Name',
      size: '200',
      render: (admin) => admin.lastName,
    },
    {
      displayName: 'Email',
      size: '320',
      render: (admin) => admin.email,
    },
    {
      displayName: 'Status',
      size: '200',
      render: (admin) => {
        return admin.isArchived ? (
          <Pill color="gray-100">Archived</Pill>
        ) : admin.isAmbassador ? (
          <Pill color="lime-100">Ambassador</Pill>
        ) : (
          <Pill color="blue-100">Full</Pill>
        );
      },
    },
  ];

  return (
    <Table columns={columns} data={admins} emptyMessage="No admins found." />
  );
}
