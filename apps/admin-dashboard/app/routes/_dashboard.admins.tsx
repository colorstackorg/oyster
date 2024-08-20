import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';

import {
  doesAdminHavePermission,
  getAdmin,
  listAdmins,
} from '@oyster/core/admins';
import { type AdminRole } from '@oyster/core/admins.types';
import { AdminTable } from '@oyster/core/admins.ui';
import { Dashboard } from '@oyster/ui';

import { ensureUserAuthenticated } from '@/shared/session.server';
import { user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const [admin, _admins] = await Promise.all([
    getAdmin({
      select: ['admins.id', 'admins.role'],
      where: { id: user(session) },
    }),
    listAdmins({
      select: [
        'admins.deletedAt',
        'admins.firstName',
        'admins.lastName',
        'admins.email',
        'admins.id',
        'admins.role',
      ],
    }),
  ]);

  if (!admin) {
    throw new Response(null, { status: 404 });
  }

  const admins = _admins.map(({ deletedAt, ...row }) => {
    return {
      ...row,

      // Admins can't delete themselves nor can they delete other admins with
      // a higher role.
      canRemove:
        !deletedAt &&
        row.id !== admin.id &&
        doesAdminHavePermission({
          minimumRole: row.role as AdminRole,
          role: admin.role as AdminRole,
        }),

      isDeleted: !!deletedAt,
    };
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
