import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';

import { addEmail, AddEmailInput } from '@oyster/core/member-profile/server';
import {
  ErrorMessage,
  Field,
  getErrors,
  Input,
  validateForm,
} from '@oyster/ui';

import {
  OnboardingBackButton,
  OnboardingButtonGroup,
  OnboardingContinueButton,
  OnboardingSectionTitle,
} from '@/routes/onboarding';
import { Route } from '@/shared/constants';
import { addEmailCookie } from '@/shared/cookies.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const email = await getEmailFromCookie(request);

  if (!email) {
    return redirect(Route['/onboarding/emails']);
  }

  return json({ email });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(
    request,
    AddEmailInput.pick({ code: true })
  );

  if (!result.ok) {
    return json({ errors: result.errors }, { status: 400 });
  }

  const email = await getEmailFromCookie(request);

  if (!email) {
    return json(
      { error: 'It looks like you timed out. Please exit and try again.' },
      { status: 400 }
    );
  }

  try {
    await addEmail({
      code: result.data.code,
      email,
      studentId: user(session),
    });

    return redirect(Route['/onboarding/community']);
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
}

async function getEmailFromCookie(request: Request) {
  return addEmailCookie.parse(request.headers.get('Cookie'));
}

export default function OnboardingVerifyEmailForm() {
  const { email } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { error, errors } = getErrors(actionData);

  return (
    <Form className="form" method="post">
      <OnboardingSectionTitle>Email Addresses</OnboardingSectionTitle>

      <Field
        description={`Please input the 6-digit passcode sent to ${email}.`}
        error={errors.code}
        label="One-Time Code"
        labelFor="code"
        required
      >
        <Input autoFocus id="code" name="code" required />
      </Field>

      <ErrorMessage>{error}</ErrorMessage>

      <OnboardingButtonGroup>
        <OnboardingBackButton to="/onboarding/emails" />
        <OnboardingContinueButton />
      </OnboardingButtonGroup>
    </Form>
  );
}
