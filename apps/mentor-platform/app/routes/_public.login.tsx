import { json, type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { Outlet } from '@remix-run/react';

import { Login, Public } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { commitSession, getSession, SESSION } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  if (session.has(SESSION.USER_ID)) {
    return redirect(Route['/'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  }

  return json({});
}

export default function LoginLayout() {
  return (
    <Public.Content>
      <Login.Title>ColorStack Mentor Platform</Login.Title>
      <Outlet />
    </Public.Content>
  );
}
