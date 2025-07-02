import { type ActionFunctionArgs, data, redirect } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';

import { sendOneTimeCode } from '@oyster/core/member-profile/server';
import {
  OneTimeCodeForm,
  SendOneTimeCodeInput,
} from '@oyster/core/member-profile/ui';
import { Button, ErrorMessage, getErrors, validateForm } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { oneTimeCodeIdCookie } from '@/shared/cookies.server';

export async function action({ request }: ActionFunctionArgs) {
  const result = await validateForm(
    request,
    SendOneTimeCodeInput.omit({ purpose: true })
  );

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  try {
    const { id } = await sendOneTimeCode({
      email: result.data.email,
      purpose: 'student_login',
    });

    return redirect(Route['/login/otp/verify'], {
      headers: {
        'Set-Cookie': await oneTimeCodeIdCookie.serialize(id),
      },
    });
  } catch (e) {
    return data({ error: (e as Error).message }, { status: 500 });
  }
}

const keys = SendOneTimeCodeInput.keyof().enum;

export default function SendOneTimeCodePage() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Form className="form" method="post">
      <OneTimeCodeForm.EmailField error={errors.email} name={keys.email} />
      <ErrorMessage>{error}</ErrorMessage>
      <Button.Submit fill>Send Code</Button.Submit>
    </Form>
  );
}
