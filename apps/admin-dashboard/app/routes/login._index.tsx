import { data, type LoaderFunctionArgs, useLoaderData } from 'react-router';

import { getGoogleAuthUri } from '@oyster/core/admin-dashboard/server';
import { ErrorMessage, Login } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ENV } from '@/shared/constants.server';
import { commitSession, getSession } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  const googleAuthUri = getGoogleAuthUri({
    clientRedirectUrl: `${ENV.ADMIN_DASHBOARD_URL}/login/oauth`,
    context: 'admin_login',
  });

  // When a user tries to login via third-party, we'll need to display an error
  // message if they aren't properly authenticated or authorized.
  const error = session.get('error');

  return data(
    {
      error,
      googleAuthUri,
    },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

export default function LoginPage() {
  const { error, googleAuthUri } = useLoaderData<typeof loader>();

  return (
    <Login.ButtonGroup>
      {!!googleAuthUri && <Login.GoogleButton href={googleAuthUri} />}
      <Login.OtpButton href={Route['/login/otp/send']} />

      {error && (
        <div className="mt-4">
          <ErrorMessage>{error}</ErrorMessage>
        </div>
      )}
    </Login.ButtonGroup>
  );
}
