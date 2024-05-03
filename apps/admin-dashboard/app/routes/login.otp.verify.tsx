import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';

import { Button, Form, getErrors, validateForm } from '@oyster/ui';

import { verifyOneTimeCode } from '@/admin-dashboard.server';
import { OneTimeCodeForm, VerifyOneTimeCodeInput } from '@/admin-dashboard.ui';
import { Route } from '@/shared/constants';
import { ENV } from '@/shared/constants.server';
import { oneTimeCodeIdCookie } from '@/shared/cookies.server';
import { commitSession, getSession, SESSION } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const oneTimeCodeId = await oneTimeCodeIdCookie.parse(
    request.headers.get('Cookie')
  );

  if (!oneTimeCodeId) {
    return redirect(Route['/login/otp/send']);
  }

  const description =
    ENV.ENVIRONMENT === 'development'
      ? 'In the development environment, you can any input any 6-digit code!'
      : undefined;

  return json({
    description,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { data, errors, ok } = await validateForm(
    request,
    VerifyOneTimeCodeInput.pick({ value: true })
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
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

    const redirectUrl = session.get(SESSION.REDIRECT_URL) || Route['/'];

    return redirect(redirectUrl, {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json({
      error: (e as Error).message,
    });
  }
}

const keys = VerifyOneTimeCodeInput.keyof().enum;

export default function VerifyOneTimeCodePage() {
  const { description } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <OneTimeCodeForm.CodeField
        description={description}
        error={errors.value}
        name={keys.value}
      />

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Submit fill>Verify Code</Button.Submit>
    </RemixForm>
  );
}
