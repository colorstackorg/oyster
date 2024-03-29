import { json, LoaderFunctionArgs, redirect } from '@remix-run/node';
import { Outlet } from '@remix-run/react';

import { Login, Public } from '@oyster/ui';

import { Route } from '../shared/constants';
import { getSession, SESSION } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  if (session.has(SESSION.USER_ID)) {
    return redirect(Route.HOME);
  }

  return json({});
}

export default function LoginLayout() {
  return (
    <Public.Layout>
      <Public.Content>
        <Login.Title>ColorStack Admin Dashboard</Login.Title>
        <Outlet />
      </Public.Content>
    </Public.Layout>
  );
}
