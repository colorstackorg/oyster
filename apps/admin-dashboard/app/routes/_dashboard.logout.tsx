import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';

import { Route } from '@/shared/constants';
import {
  destroySession,
  ensureUserAuthenticated,
  getSession,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request);

  return redirect(Route['/login'], {
    headers: {
      'Set-Cookie': await destroySession(session),
    },
  });
}
