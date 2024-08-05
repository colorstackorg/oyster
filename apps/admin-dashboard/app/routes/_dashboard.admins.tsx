import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';

import { listAdmins } from '@oyster/core/admins';
import { AdminTable } from '@oyster/core/admins.ui';
import { Dashboard } from '@oyster/ui';

import { listAdmins } from '@/admin-dashboard.server';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const admins = await listAdmins({
    select: [
      'admins.firstName',
      'admins.lastName',
      'admins.email',
      'admins.id',
      'admins.role',
    ],
  });

  return json({
    admins,
  });
}

export default function Admins() {
  const { admins } = useLoaderData<typeof loader>();

  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Admins</Dashboard.Title>
      </Dashboard.Header>

      <AdminTable admins={admins} />
      <Outlet />
    </>
  );
}
