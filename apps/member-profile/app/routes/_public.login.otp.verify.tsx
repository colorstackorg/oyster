import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigation,
} from '@remix-run/react';

import {
  Button,
  Form,
  getActionErrors,
  validateForm,
} from '@colorstack/core-ui';

import { Route } from '../shared/constants';
import { oneTimeCodeIdCookie } from '../shared/cookies.server';
import { verifyOneTimeCode } from '../shared/core.server';
import { OneTimeCodeForm, VerifyOneTimeCodeInput } from '../shared/core.ui';
import { trackWithoutRequest } from '../shared/mixpanel.server';
import { commitSession, getSession, SESSION } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const oneTimeCodeId = await oneTimeCodeIdCookie.parse(
    request.headers.get('Cookie')
  );

  if (!oneTimeCodeId) {
    return redirect(Route.LOGIN_OTP_SEND);
  }

  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();

  const { data, errors } = validateForm(
    VerifyOneTimeCodeInput.pick({ value: true }),
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  const oneTimeCodeId = await oneTimeCodeIdCookie.parse(
    request.headers.get('Cookie')
  );

  if (!oneTimeCodeId) {
    return json({
      error: 'Your one-time code was not found. Please request a new code.',
      errors,
    });
  }

  try {
    const { userId } = await verifyOneTimeCode({
      id: oneTimeCodeId,
      value: data.value,
    });

    const session = await getSession(request);

    session.set(SESSION.USER_ID, userId);

    trackWithoutRequest(userId, 'Logged In', {
      Method: 'OTP',
    });

    const redirectUrl = session.get(SESSION.REDIRECT_URL) || Route.HOME;

    return redirect(redirectUrl, {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json({
      error: (e as Error).message,
      errors,
    });
  }
}

const keys = VerifyOneTimeCodeInput.keyof().enum;

export default function VerifyOneTimeCodePage() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

  return (
    <RemixForm className="form" method="post">
      <OneTimeCodeForm.CodeField error={errors.value} name={keys.value} />

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button fill loading={submitting} type="submit">
        Verify Code
      </Button>
    </RemixForm>
  );
}
