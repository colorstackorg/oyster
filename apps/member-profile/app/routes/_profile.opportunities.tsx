import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet } from '@remix-run/react';

import { Dashboard } from '@oyster/ui';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export default function OpportunitiesPage() {
  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Opportunities 💰</Dashboard.Title>
      </Dashboard.Header>

      <Outlet />
    </>
  );
}
