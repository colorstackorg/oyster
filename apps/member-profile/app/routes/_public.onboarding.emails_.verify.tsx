import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { type z } from 'zod';

import { job } from '@oyster/core/bull';
import {
  OneTimeCode,
  OneTimeCodePurpose,
} from '@oyster/core/member-profile/ui';
import { db } from '@oyster/db';
import { StudentEmail } from '@oyster/types';
import {
  Button,
  ErrorMessage,
  Field,
  getErrors,
  Input,
  validateForm,
} from '@oyster/ui';

import {
  ContinueButton,
  SectionDescription,
  SectionTitle,
} from '@/routes/_public.onboarding';
import { BackButton } from '@/routes/_public.onboarding';
import { Route } from '@/shared/constants';
import { addEmailCookie } from '@/shared/cookies.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const email = await addEmailCookie.parse(request.headers.get('Cookie'));

  if (!email) {
    return redirect(Route['/profile/emails/add/start']);
  }

  return json({ email });
}

const AddEmailInput = StudentEmail.pick({
  email: true,
  studentId: true,
})
  .extend({ code: OneTimeCode.shape.value })
  .required();

type AddEmailInput = z.infer<typeof AddEmailInput>;

const AddEmailFormData = AddEmailInput.pick({
  code: true,
});

type AddEmailFormData = z.infer<typeof AddEmailFormData>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(request, AddEmailFormData);

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  const email = await addEmailCookie.parse(request.headers.get('Cookie'));

  if (!email) {
    return json({
      error: 'It looks like you timed out. Please exit and try again.',
      errors,
    });
  }

  try {
    await addEmail({
      code: data.code,
      email,
      studentId: user(session),
    });

    return redirect(Route['/onboarding/education']);
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
}

async function addEmail(input: AddEmailInput) {
  const existingEmail = await db
    .selectFrom('studentEmails')
    .select(['studentId'])
    .where('email', 'ilike', input.email)
    .executeTakeFirst();

  if (existingEmail) {
    throw new Error(
      existingEmail.studentId === input.studentId
        ? 'This email already belongs to you.'
        : 'The email you are trying to add belongs to another member.'
    );
  }

  const oneTimeCode = await db
    .selectFrom('oneTimeCodes')
    .select('id')
    .where('email', 'ilike', input.email)
    .where('purpose', '=', OneTimeCodePurpose.ADD_STUDENT_EMAIL)
    .where('studentId', '=', input.studentId)
    .where('value', '=', input.code as string)
    .executeTakeFirst();

  if (!oneTimeCode) {
    throw new Error('The code was either wrong or expired. Please try again.');
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('studentEmails')
      .values({
        email: input.email,
        studentId: input.studentId,
      })
      .execute();

    await trx
      .deleteFrom('oneTimeCodes')
      .where('id', '=', oneTimeCode.id)
      .execute();
  });

  job('member_email.added', {
    email: input.email,
    studentId: input.studentId,
  });
}

export default function OnboardingEmailForm() {
  const { email } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { error, errors } = getErrors(actionData);

  return (
    <Form className="form" method="post">
      <SectionTitle>Email Addresses</SectionTitle>
      <SectionDescription>
        Please input the 6-digit passcode that you received to complete the
        addition of <span style={{ fontWeight: 700 }}>{email}</span> to your
        profile.
      </SectionDescription>

      <Field error={errors.code} labelFor="code" required>
        <Input autoFocus id="code" name="code" required />
      </Field>

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Group spacing="between">
        <BackButton step="personal" />
        <ContinueButton />
      </Button.Group>
    </Form>
  );
}
