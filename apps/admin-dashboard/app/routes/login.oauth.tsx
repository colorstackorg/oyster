import { type LoaderFunctionArgs, redirect } from '@remix-run/node';
import jwt from 'jsonwebtoken';

import { Route } from '../shared/constants';
import { ENV } from '../shared/constants.server';
import { isAmbassador } from '../shared/queries/admin';
import { commitSession, getSession, SESSION } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  const url = new URL(request.url);

  // For now, we're going to look for a token in the query string. We could
  // convert this to a cookie in the future, but for now this is fine.
  const token = url.searchParams.get('token');

  if (!token) {
    session.flash('error', url.searchParams.get('error'));

    return redirect(Route['/login'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  }

  let id = '';

  // The token that is returned is JWT, so we have to verify and decode it in
  // order to get the user ID.
  try {
    const data = jwt.verify(token, ENV.JWT_SECRET) as { id: string };

    id = data.id;
  } catch {
    return redirect(Route['/login']);
  }

  const ambassador = await isAmbassador(id);

  session.set(SESSION.IS_AMBASSADOR, ambassador);
  session.set(SESSION.USER_ID, id);

  const redirectUrl = session.get(SESSION.REDIRECT_URL) || Route.HOME;

  return redirect(redirectUrl, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}
