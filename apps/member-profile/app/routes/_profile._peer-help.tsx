import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';

import { cx, Dashboard } from '@oyster/ui';

import { NavigationItem } from '@/shared/components/navigation';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

// Page

export default function OpportunitiesPage() {
  // const {} = useLoaderData<typeof loader>();

  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Peer Help 💬</Dashboard.Title>
      </Dashboard.Header>

      <nav className="mr-auto">
        <ul className="flex items-center gap-4">
          <NavigationItem to={Route['/peer-help']}>
            Open Requests
          </NavigationItem>

          <NavigationItem to={Route['/peer-help/me']}>
            My Requests
          </NavigationItem>
        </ul>
      </nav>

      <Outlet />
    </>
  );
}
