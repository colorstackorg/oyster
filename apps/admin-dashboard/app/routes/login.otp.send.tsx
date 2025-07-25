import {
  type ActionFunctionArgs,
  data,
  Form,
  redirect,
  useActionData,
} from 'react-router';

import { sendOneTimeCode } from '@oyster/core/admin-dashboard/server';
import {
  OneTimeCodeForm,
  SendOneTimeCodeInput,
} from '@oyster/core/admin-dashboard/ui';
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
      purpose: 'admin_login',
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
