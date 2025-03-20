import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  Link,
  type LinkProps,
  Outlet,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import { type PropsWithChildren } from 'react';

import { db } from '@oyster/db';
import { Button, cx, Dashboard } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);
  const memberId = user(session);

  const url = new URL(request.url);
  const isMeView = url.searchParams.get('view') === 'me';

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

    db
      .selectFrom('helpRequests')
      .select(['helpRequests.id'])
      .$if(isMeView, (eb) => {
        return eb.where((eb) => {
          return eb.or([
            eb('helpeeId', '=', memberId),
            eb('helperId', '=', memberId),
          ]);
        });
      })
      .$if(!isMeView, (eb) => {
        return eb.where('status', '=', 'open').where('helperId', 'is', null);
      })
      .execute(),
  ]);

  return json({
    myCount,
    openCount,
  });
}

type listHelpRequestsProps = {
  memberId: string;
  view: 'me' | 'open';
};

async function listHelpRequests({ memberId, view }: listHelpRequestsProps) {
  const query = db
    .selectFrom('helpRequests')
    .$if(view === 'me', (eb) => {
      return eb.where((eb) => {
        return eb.or([
          eb('helpeeId', '=', memberId),
          eb('helperId', '=', memberId),
        ]);
      });
    })
    .$if(view === 'open', (eb) => {
      return eb.where('status', '=', 'open').where('helperId', 'is', null);
    });

  const [records, { count }] = await Promise.all([
    query
      .leftJoin('students as helpees', 'helpees.id', 'helpRequests.helpeeId')
      .leftJoin('students as helpers', 'helpers.id', 'helpRequests.helperId')
      .select([
        'helpees.firstName as helpeeFirstName',
        'helpees.lastName as helpeeLastName',
        'helpees.profilePicture as helpeeProfilePicture',
        'helpers.firstName as helperFirstName',
        'helpers.lastName as helperLastName',
        'helpers.profilePicture as helperProfilePicture',
        'helpRequests.createdAt',
        'helpRequests.helpBy',
        'helpRequests.id',
        'helpRequests.summary',
        'helpRequests.type',
      ])
      .orderBy('helpRequests.helpBy', 'asc')
      .orderBy('helpRequests.createdAt', 'desc')
      .execute(),

    query
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  return {
    records,
    totalCount: Number(count),
  };
}

// Page

export default function PeerHelpLayout() {
  const { myCount, openCount } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>Peer Help 💬</Dashboard.Title>
        <RequestHelpButton />
      </Dashboard.Header>

      <nav className="mr-auto">
        <ul className="flex items-center gap-4">
          <NavigationItem
            active={searchParams.get('view') !== 'me'}
            to={{
              pathname: Route['/peer-help'],
              search: '', // The default view is open requests.
            }}
          >
            Open Requests ({openCount})
          </NavigationItem>

          <NavigationItem
            active={searchParams.get('view') === 'me'}
            to={{
              pathname: Route['/peer-help'],
              search: new URLSearchParams({ view: 'me' }).toString(),
            }}
          >
            My Requests ({myCount})
          </NavigationItem>
        </ul>
      </nav>

      <Outlet />
    </>
  );
}

function RequestHelpButton() {
  const [searchParams] = useSearchParams();

  return (
    <Button.Slot size="small">
      <Link
        to={{
          pathname: Route['/peer-help/request'],
          search: searchParams.toString(),
        }}
      >
        Request Help
      </Link>
    </Button.Slot>
  );
}

type NavigationItemProps = PropsWithChildren<{
  active?: boolean;
  to: LinkProps['to'];
}>;

// Needed to create a custom navigation item for this because we're using query
// params to determine the active state, not pathnames.
function NavigationItem({ active, children, to }: NavigationItemProps) {
  return (
    <li>
      <Link
        className={cx(
          'underline hover:text-primary',
          active && 'text-primary underline'
        )}
        to={to}
      >
        {children}
      </Link>
    </li>
  );
}
