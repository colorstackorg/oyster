import { type LoaderFunctionArgs, Outlet, redirect } from 'react-router';

import { Login, Public } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { getAuthenticationStatus, getSession } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  const { authenticated } = await getAuthenticationStatus(session);

  if (authenticated) {
    return redirect(Route['/']);
  }

  return null;
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
