import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';
import { type z } from 'zod';

import { db } from '@oyster/db';
import {
  Button,
  Form,
  getErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';
import { id } from '@oyster/utils';

import { job } from '@/member-profile.server';
import { OneTimeCode, OneTimeCodePurpose } from '@/member-profile.ui';
import { Route } from '@/shared/constants';
import { addEmailCookie } from '@/shared/cookies.server';
import {
  commitSession,
  ensureUserAuthenticated,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

const SendEmailCodeInput = OneTimeCode.pick({
  email: true,
});

type SendEmailCodeInput = z.infer<typeof SendEmailCodeInput>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(request, SendEmailCodeInput);

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  try {
    await sendEmailCode(user(session), data);

    return redirect(Route['/profile/emails/add/finish'], {
      headers: [
        ['Set-Cookie', await addEmailCookie.serialize(data.email)],
        ['Set-Cookie', await commitSession(session)],
      ],
    });
  } catch (e) {
    return json({
      error: (e as Error).message,
    });
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

const keys = SendEmailCodeInput.keyof().enum;

export default function AddEmailPage() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/profile/emails']}>
      <Modal.Header>
        <Modal.Title>Add Email Address</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        We will send you a one-time code to verify that you own this email
        address.
      </Modal.Description>

      <RemixForm className="form" method="post">
        <Form.Field
          error={errors.email}
          label="Email"
          labelFor={keys.email}
          required
        >
          <Input
            autoFocus
            id={keys.email}
            name={keys.email}
            placeholder="me@gmail.com"
            required
          />
        </Form.Field>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Send Code</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
