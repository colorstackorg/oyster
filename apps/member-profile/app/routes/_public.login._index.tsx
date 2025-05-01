import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import {
  getGoogleAuthUri,
  getSlackAuthUri,
} from '@oyster/core/member-profile/server';
import { ErrorMessage, Login, Text } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ENV } from '@/shared/constants.server';
import { commitSession, getSession, SESSION } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  const googleAuthUri = getGoogleAuthUri({
    clientRedirectUrl: `${ENV.STUDENT_PROFILE_URL}/login/oauth`,
    context: 'student_login',
  });

  const slackAuthUri = getSlackAuthUri({
    clientRedirectUrl: `${ENV.STUDENT_PROFILE_URL}/login/oauth`,
    context: 'student_login',
  });

  // When a user tries to login via third-party, we'll need to display an error
  // message if they aren't properly authenticated or authorized.
  const error = session.get('error');

  const message = session.get(SESSION.LOGIN_MESSAGE);

  return json(
    {
      error,
      googleAuthUri,
      message,
      slackAuthUri,
    },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

export default function LoginPage() {
  const { error, googleAuthUri, message, slackAuthUri } =
    useLoaderData<typeof loader>();

  return (
    <>
      {!!message && <Text color="gray-500">{message}</Text>}

      <Login.ButtonGroup>
        {!!googleAuthUri && <Login.GoogleButton href={googleAuthUri} />}
        {!!slackAuthUri && <Login.SlackButton href={slackAuthUri} />}
        <Login.OtpButton href={Route['/login/otp/send']} />

        {error && (
          <div className="mt-4">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
        )}
      </Login.ButtonGroup>
    </>
  );
}
