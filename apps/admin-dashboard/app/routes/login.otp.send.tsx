import { type ActionFunctionArgs, json, redirect } from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigation,
} from '@remix-run/react';

import { Button, Form, getActionErrors, validateForm } from '@oyster/ui';

import { Route } from '../shared/constants';
import { oneTimeCodeIdCookie } from '../shared/cookies.server';
import { sendOneTimeCode } from '../shared/core.server';
import { OneTimeCodeForm, SendOneTimeCodeInput } from '../shared/core.ui';

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();

  const { data, errors } = validateForm(
    SendOneTimeCodeInput.omit({ purpose: true }),
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  try {
    const { id } = await sendOneTimeCode({
      email: data.email,
      purpose: 'admin_login',
    });

    return redirect(Route['/login/otp/verify'], {
      headers: {
        'Set-Cookie': await oneTimeCodeIdCookie.serialize(id),
      },
    });
  } catch (e) {
    return json({
      error: (e as Error).message,
      errors,
    });
  }
}

const keys = SendOneTimeCodeInput.keyof().enum;

export default function SendOneTimeCodePage() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

  return (
    <RemixForm className="form" method="post">
      <OneTimeCodeForm.EmailField error={errors.email} name={keys.email} />

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button fill loading={submitting} type="submit">
        Send Code
      </Button>
    </RemixForm>
  );
}
