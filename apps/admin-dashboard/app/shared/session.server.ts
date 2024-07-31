import {
  createCookieSessionStorage,
  redirect,
  type Session,
} from '@remix-run/node';

import { type ToastProps } from '@oyster/ui';
import { id, iife } from '@oyster/utils';

import { Route } from '@/shared/constants';
import { ENV } from '@/shared/constants.server';

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

  const authenticated = iife(() => {
    if (!admin(session)) {
      return false;
    }

    if (!options.allowAmbassador && !!isAmbassador(session)) {
      return false;
    }

    return true;
  });

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

// Session Helpers

export function admin(session: Session) {
  return session.get(SESSION.USER_ID) as string;
}

export function isAmbassador(session: Session) {
  return session.get(SESSION.IS_AMBASSADOR) as boolean;
}

export function toast(session: Session, toast: ToastProps) {
  session.flash(SESSION.TOAST, {
    id: id(),
    message: toast.message,
    type: toast.type,
  });
}
