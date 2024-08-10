import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';

import { listAdmins } from '@oyster/core/admins';
import { AdminTable } from '@oyster/core/admins.ui';
import { Dashboard } from '@oyster/ui';

import { ensureUserAuthenticated } from '@/shared/session.server';
import { user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const userId = user(session);

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
    userId,
  });
}

export default function Admins() {
  const { admins, userId } = useLoaderData<typeof loader>();

  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Admins</Dashboard.Title>
      </Dashboard.Header>

      <AdminTable admins={admins} userId={userId} />
      <Outlet />
    </>
  );
}
