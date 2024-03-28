import { createCookieSessionStorage, redirect, Session } from '@remix-run/node';

import { ToastProps } from '@oyster/core-ui';

import { Route } from './constants';
import { ENV } from './constants.server';

const {
  getSession: _getSession,
  commitSession,
  destroySession,
} = createCookieSessionStorage({
  cookie: {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    name: `__session_admin-dashboard_${ENV.ENVIRONMENT}`,
    secrets: [ENV.SESSION_SECRET],
    secure: ENV.ENVIRONMENT !== 'development',
  },
});

export { commitSession, destroySession };

export async function getSession(request: Request) {
  return _getSession(request.headers.get('Cookie'));
}

export const SESSION = {
  IS_AMBASSADOR: 'is_ambassador',
  REDIRECT_URL: 'redirect_url',
  TOAST: 'toast',
  USER_ID: 'user_id',
} as const;

// Authentication

type EnsureUserAuthenticatedOptions = {
  allowAmbassador?: boolean;
};

export async function ensureUserAuthenticated(
  request: Request,
  options: EnsureUserAuthenticatedOptions = {}
) {
  const session = await getSession(request);

  const authenticated = isUserAuthenticated(session, options);

  if (!authenticated) {
    session.flash(SESSION.REDIRECT_URL, request.url);

    throw redirect(Route['/login'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  }

  return session;
}

function isUserAuthenticated(
  session: Session,
  options: EnsureUserAuthenticatedOptions = {}
) {
  if (!user(session)) {
    return false;
  }

  if (!options.allowAmbassador && !!isAmbassador(session)) {
    return false;
  }

  return true;
}

// Session Helpers

export function isAmbassador(session: Session) {
  return session.get(SESSION.IS_AMBASSADOR) as boolean;
}

export function toast(session: Session, toast: ToastProps) {
  session.flash(SESSION.TOAST, {
    message: toast.message,
    type: toast.type,
  });
}

export function user(session: Session) {
  return session.get(SESSION.USER_ID) as string;
}
