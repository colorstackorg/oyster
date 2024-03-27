import { createCookieSessionStorage, redirect, Session } from '@remix-run/node';

import { ToastProps } from '@colorstack/core-ui';

import { Route } from './constants';
import { ENV } from './constants.server';

const {
  getSession: _getSession,
  commitSession,
  destroySession,
} = createCookieSessionStorage({
  cookie: {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    name: `__session_member-profile_${ENV.ENVIRONMENT}`,
    secrets: [ENV.SESSION_SECRET],
    secure: ENV.ENVIRONMENT !== 'development',
  },
});

export { commitSession, destroySession };

export async function getSession(request: Request): Promise<Session> {
  return _getSession(request.headers.get('Cookie'));
}

export const SESSION = {
  REDIRECT_URL: 'redirect_url',
  TOAST: 'toast',
  USER_ID: 'user_id',
} as const;

// Authentication

type EnsureUserAuthenticatedOptions = {
  redirectTo?: string;
};

export async function ensureUserAuthenticated(
  request: Request,
  { redirectTo = Route.LOGIN }: EnsureUserAuthenticatedOptions = {}
): Promise<Session> {
  const session = await getSession(request);

  if (!session.has(SESSION.USER_ID)) {
    session.flash(SESSION.REDIRECT_URL, request.url);

    throw redirect(redirectTo, {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  }

  return session;
}

export function user(session: Session): string {
  return session.get(SESSION.USER_ID);
}

// Toast (Flash)

export function toast(session: Session, toast: ToastProps): void {
  session.flash(SESSION.TOAST, {
    message: toast.message,
    type: toast.type,
  });
}
