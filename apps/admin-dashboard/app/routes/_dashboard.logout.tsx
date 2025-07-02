import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  redirect,
} from 'react-router';

import { Route } from '@/shared/constants';
import {
  destroySession,
  ensureUserAuthenticated,
  getSession,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request);

  return redirect(Route['/login'], {
    headers: {
      'Set-Cookie': await destroySession(session),
    },
  });
}
