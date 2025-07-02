import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';

import { verifyOneTimeCode } from '@oyster/core/admin-dashboard/server';
import {
  OneTimeCodeForm,
  VerifyOneTimeCodeInput,
} from '@oyster/core/admin-dashboard/ui';
import { Button, ErrorMessage, getErrors, validateForm } from '@oyster/ui';

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

  return {
    description,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const result = await validateForm(
    request,
    VerifyOneTimeCodeInput.pick({ value: true })
  );

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  const oneTimeCodeId = await oneTimeCodeIdCookie.parse(
    request.headers.get('Cookie')
  );

  if (!oneTimeCodeId) {
    return data(
      { error: 'Your one-time code was not found. Please request a new code.' },
      { status: 400 }
    );
  }

  try {
    const { userId } = await verifyOneTimeCode({
      id: oneTimeCodeId,
      value: result.data.value,
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
    return data({ error: (e as Error).message }, { status: 500 });
  }
}

const keys = VerifyOneTimeCodeInput.keyof().enum;

export default function VerifyOneTimeCodePage() {
  const { description } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Form className="form" method="post">
      <OneTimeCodeForm.CodeField
        description={description}
        error={errors.value}
        name={keys.value}
      />

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Submit fill>Verify Code</Button.Submit>
    </Form>
  );
}
