import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData,
} from '@remix-run/react';
import { type z } from 'zod';

import { job } from '@oyster/core/bull';
import {
  OneTimeCode,
  OneTimeCodePurpose,
} from '@oyster/core/member-profile/ui';
import { db } from '@oyster/db';
import {
  Button,
  ErrorMessage,
  Field,
  getErrors,
  Input,
  validateForm,
} from '@oyster/ui';
import { id } from '@oyster/utils';

import {
  ContinueButton,
  OnboardingButtonGroup,
  SectionTitle,
} from '@/routes/_public.onboarding';
import { BackButton } from '@/routes/_public.onboarding';
import { Route } from '@/shared/constants';
import { addEmailCookie } from '@/shared/cookies.server';
import {
  commitSession,
  ensureUserAuthenticated,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const [member, secondaryEmail] = await Promise.all([
    db
      .selectFrom('students')
      .where('id', '=', user(session))
      .select(['email'])
      .executeTakeFirst(),

    db
      .selectFrom('studentEmails')
      .where('studentId', '=', user(session))
      .select('email')
      .orderBy('createdAt', 'asc')
      .offset(1)
      .executeTakeFirst(),
  ]);

  if (!member) {
    return redirect(Route['/login']);
  }

  return json({ primaryEmail: member.email, secondaryEmail });
}

const SendEmailCodeInput = OneTimeCode.pick({
  email: true,
});

type SendEmailCodeInput = z.infer<typeof SendEmailCodeInput>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const secondaryEmail = await db
    .selectFrom('studentEmails')
    .where('studentId', '=', user(session))
    .select('email')
    .orderBy('createdAt', 'asc')
    .offset(1)
    .executeTakeFirst();

  if (secondaryEmail) {
    return redirect(Route['/onboarding/education']);
  }

  const { data, errors, ok } = await validateForm(request, SendEmailCodeInput);

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  try {
    await sendEmailCode(user(session), data);

    return redirect(Route['/onboarding/emails/verify'], {
      headers: [
        ['Set-Cookie', await addEmailCookie.serialize(data.email)],
        ['Set-Cookie', await commitSession(session)],
      ],
    });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
}

async function sendEmailCode(studentId: string, input: SendEmailCodeInput) {
  const existingEmail = await db
    .selectFrom('studentEmails')
    .select(['studentId'])
    .where('email', 'ilike', input.email)
    .executeTakeFirst();

  if (existingEmail) {
    throw new Error(
      existingEmail.studentId === studentId
        ? 'This email already belongs to you.'
        : 'The email you are trying to add belongs to another member.'
    );
  }

  const [oneTimeCode, student] = await db.transaction().execute(async (trx) => {
    const oneTimeCode = await trx
      .insertInto('oneTimeCodes')
      .returning(['email', 'id', 'value'])
      .values({
        email: input.email,
        id: id(),
        purpose: OneTimeCodePurpose.ADD_STUDENT_EMAIL,
        value: Math.random().toString().slice(-6),
        studentId,
      })
      .executeTakeFirstOrThrow();

    await trx
      .deleteFrom('oneTimeCodes')
      .where('id', '!=', oneTimeCode.id)
      .where('purpose', '=', OneTimeCodePurpose.ADD_STUDENT_EMAIL)
      .where('studentId', '=', studentId)
      .execute();

    const student = await trx
      .selectFrom('students')
      .select(['firstName'])
      .where('id', '=', studentId)
      .executeTakeFirstOrThrow();

    return [oneTimeCode, student];
  });

  job('notification.email.send', {
    to: oneTimeCode.email,
    name: 'one-time-code-sent',
    data: {
      code: oneTimeCode.value,
      firstName: student.firstName,
    },
  });
}

export default function OnboardingEmailForm() {
  const { primaryEmail, secondaryEmail } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { error, errors } = getErrors(actionData);

  return (
    <Form className="form" method="post">
      <SectionTitle>Email Addresses</SectionTitle>

      <Field
        description="This is the email address that you applied with. You can change your primary email at any time."
        label="Primary Email"
        labelFor="email"
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
          defaultValue={secondaryEmail?.email}
          disabled={!!secondaryEmail}
          id="email"
          name="email"
          required
          type="email"
        />
      </Field>

      <ErrorMessage>{error}</ErrorMessage>

      <OnboardingButtonGroup>
        <BackButton to="/onboarding/general" />
        <ContinueButton />
      </OnboardingButtonGroup>
    </Form>
  );
}
