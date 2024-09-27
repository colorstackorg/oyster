import {
  createCookieSessionStorage,
  redirect,
  type Session,
} from '@remix-run/node';

import { doesAdminHavePermission, getAdmin } from '@oyster/core/admins';
import { type AdminRole } from '@oyster/core/admins/types';
import { type ToastProps } from '@oyster/ui';
import { id } from '@oyster/utils';

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
  REDIRECT_URL: 'redirect_url',
  TOAST: 'toast',
  USER_ID: 'user_id',
} as const;

// Authentication

type EnsureUserAuthenticatedOptions = {
  minimumRole?: AdminRole;
};

export async function ensureUserAuthenticated(
  request: Request,
  options: EnsureUserAuthenticatedOptions = {}
) {
  const session = await getSession(request);

  // In order to determine if the user is authenticated, we'll query the DB
  // for the admin record and check the admin's role.
  const { authenticated, authorized } = await getAuthenticationStatus(
    session,
    options
  );

  // If the user isn't authenticated, they'll need to log in.
  if (!authenticated) {
    session.unset(SESSION.USER_ID);
    session.flash(SESSION.REDIRECT_URL, request.url);

    throw redirect(Route['/login'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  }

  // If the user isn't authorized, they'll just get a 403. We don't redirect to
  // the login page because they're already logged in!
  if (!authorized) {
    throw new Response(null, {
      status: 403,
      statusText: 'You are not authorized to access this page.',
    });
  }

  return session;
}

/**
 * Returns both the authentication and authorization status of the user.
 *
 * An admin will be considered authenticated if they have a valid user_id set
 * in the session (checked against the DB). They will be considered authorized
 * if their role is at least the `minimumRole` provided.
 */
export async function getAuthenticationStatus(
  session: Session,
  options: EnsureUserAuthenticatedOptions = {}
) {
  const adminId = user(session);

  if (!adminId) {
    return {
      authenticated: false,
      authorized: false,
    };
  }

  const admin = await getAdmin({
    select: ['admins.role'],
    where: { id: adminId },
  });

  // This is the case in which the admin record was deleted and went back to
  // the Admin Dashboard.
  if (!admin) {
    return {
      authenticated: false,
      authorized: false,
    };
  }

  const hasPermission = doesAdminHavePermission({
    minimumRole: options.minimumRole || 'admin',
    role: admin.role as AdminRole,
  });

  if (!hasPermission) {
    return {
      authenticated: true,
      authorized: false,
    };
  }

  return {
    authenticated: true,
    authorized: true,
  };
}

// Session Helpers

export function user(session: Session) {
  return session.get(SESSION.USER_ID) as string;
}

export function toast(session: Session, toast: ToastProps) {
  session.flash(SESSION.TOAST, {
    id: id(),
    message: toast.message,
    type: toast.type,
  });
}
