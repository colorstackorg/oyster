import { type ActionFunctionArgs, json, redirect } from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';

import { sendOneTimeCode } from '@oyster/core/member-profile/server';
import {
  OneTimeCodeForm,
  SendOneTimeCodeInput,
} from '@oyster/core/member-profile/ui';
import { Button, Form, getErrors, validateForm } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { oneTimeCodeIdCookie } from '@/shared/cookies.server';

export async function action({ request }: ActionFunctionArgs) {
  const { data, errors, ok } = await validateForm(
    request,
    SendOneTimeCodeInput.omit({ purpose: true })
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  try {
    const { id } = await sendOneTimeCode({
      email: data.email,
      purpose: 'student_login',
    });

    return redirect(Route['/login/otp/verify'], {
      headers: {
        'Set-Cookie': await oneTimeCodeIdCookie.serialize(id),
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
}

const keys = SendOneTimeCodeInput.keyof().enum;

export default function SendOneTimeCodePage() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <OneTimeCodeForm.EmailField error={errors.email} name={keys.email} />
      <Form.ErrorMessage>{error}</Form.ErrorMessage>
      <Button.Submit fill>Send Code</Button.Submit>
    </RemixForm>
  );
}
