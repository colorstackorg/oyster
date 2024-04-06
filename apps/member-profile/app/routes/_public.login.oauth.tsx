import { type LoaderFunctionArgs, redirect } from '@remix-run/node';
import jwt from 'jsonwebtoken';

import { toTitleCase } from '@oyster/utils';

import { Route } from '../shared/constants';
import { ENV } from '../shared/constants.server';
import { trackWithoutRequest } from '../shared/mixpanel.server';
import { commitSession, getSession, SESSION } from '../shared/session.server';

// TODO: Add Zod validation here.

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  const url = new URL(request.url);

  // For now, we're going to look for a token in the query string. We could
  // convert this to a cookie in the future, but for now this is fine.
  const { error, method, token } = Object.fromEntries(url.searchParams);

  if (!token) {
    session.flash('error', error);

    return redirect(Route.LOGIN, {
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
    return redirect(Route.LOGIN);
  }

  session.set(SESSION.USER_ID, id);

  trackWithoutRequest(id, 'Logged In', {
    Method: toTitleCase(method) as 'Google' | 'Slack',
  });

  const redirectUrl = session.get(SESSION.REDIRECT_URL) || Route.HOME;

  return redirect(redirectUrl, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}
