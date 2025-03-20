import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';

import { db } from '@oyster/db';
import { Dashboard } from '@oyster/ui';

import { NavigationItem } from '@/shared/components/navigation';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);

  const [{ count: openCount }, { count: myCount }] = await Promise.all([
    db
      .selectFrom('helpRequests')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('status', '=', 'open')
      .executeTakeFirstOrThrow(),

    db
      .selectFrom('helpRequests')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where((eb) => {
        return eb.or([
          eb('helpeeId', '=', memberId),
          eb('helperId', '=', memberId),
        ]);
      })
      .executeTakeFirstOrThrow(),
  ]);

  return json({
    myCount,
    openCount,
  });
}

// Page

export default function PeerHelpLayout() {
  const { myCount, openCount } = useLoaderData<typeof loader>();

  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Peer Help 💬</Dashboard.Title>
      </Dashboard.Header>

      <nav className="mr-auto">
        <ul className="flex items-center gap-4">
          <NavigationItem to={Route['/peer-help/open']}>
            Open Requests ({openCount})
          </NavigationItem>

          <NavigationItem to={Route['/peer-help/me']}>
            My Requests ({myCount})
          </NavigationItem>
        </ul>
      </nav>

      <Outlet />
    </>
  );
}
