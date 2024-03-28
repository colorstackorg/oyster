import { json, LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import { Form } from '@oyster/core-ui';
import { Login } from '@oyster/feature-ui';

import { Route } from '../shared/constants';
import { ENV } from '../shared/constants.server';
import { getGoogleAuthUri, getSlackAuthUri } from '../shared/core.server';
import { commitSession, getSession } from '../shared/session.server';

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

  return json(
    {
      error,
      googleAuthUri,
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
  const { error, googleAuthUri, slackAuthUri } = useLoaderData<typeof loader>();

  return (
    <Login.ButtonGroup>
      {!!googleAuthUri && <Login.GoogleButton href={googleAuthUri} />}
      {!!slackAuthUri && <Login.SlackButton href={slackAuthUri} />}
      <Login.OtpButton href={Route.LOGIN_OTP_SEND} />

      {error && (
        <div className="mt-4">
          <Form.ErrorMessage>{error}</Form.ErrorMessage>
        </div>
      )}
    </Login.ButtonGroup>
  );
}
