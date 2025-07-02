import {
  type ActionFunctionArgs,
  data,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
  useLoaderData,
} from 'react-router';

import {
  sendEmailCode,
  SendEmailCodeInput,
} from '@oyster/core/member-profile/server';
import { db } from '@oyster/db';
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
import {
  commitSession,
  ensureUserAuthenticated,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const [primaryEmailRow, secondaryEmailRow] = await db
    .selectFrom('studentEmails')
    .select('email')
    .where('studentId', '=', user(session))
    .orderBy('createdAt', 'asc')
    .execute();

  return {
    primaryEmail: primaryEmailRow?.email,
    secondaryEmail: secondaryEmailRow?.email,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const emails = await db
    .selectFrom('studentEmails')
    .select('email')
    .where('studentId', '=', user(session))
    .orderBy('createdAt', 'asc')
    .execute();

  if (emails.length >= 2) {
    return redirect(Route['/onboarding/community']);
  }

  const result = await validateForm(request, SendEmailCodeInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  try {
    await sendEmailCode(user(session), result.data);

    return redirect(Route['/onboarding/emails/verify'], {
      headers: [
        ['Set-Cookie', await addEmailCookie.serialize(result.data.email)],
        ['Set-Cookie', await commitSession(session)],
      ],
    });
  } catch (e) {
    return data({ error: (e as Error).message }, { status: 500 });
  }
}

export default function OnboardingEmailForm() {
  const { primaryEmail, secondaryEmail } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { error, errors } = getErrors(actionData);

  return (
    <Form className="form" method="post">
      <OnboardingSectionTitle>Email Addresses</OnboardingSectionTitle>

      <Field
        description="This is the email address that you applied with. You can change your primary email in your Member Profile at any time after onboarding."
        label="Primary Email"
        labelFor="primaryEmail"
        required
      >
        <Input
          defaultValue={primaryEmail}
          disabled
          id="primaryEmail"
          name="primaryEmail"
          required
          type="email"
        />
      </Field>

      <Field
        description="Add your personal email so that you can still log in to ColorStack even after you graduate and no longer have access to your school email."
        error={errors.email}
        label="Secondary Email"
        labelFor="email"
        required
      >
        <Input
          defaultValue={secondaryEmail}
          disabled={!!secondaryEmail}
          id="email"
          name="email"
          required
          type="email"
        />
      </Field>

      <ErrorMessage>{error}</ErrorMessage>

      <OnboardingButtonGroup>
        <OnboardingBackButton to="/onboarding/general" />
        <OnboardingContinueButton />
      </OnboardingButtonGroup>
    </Form>
  );
}
