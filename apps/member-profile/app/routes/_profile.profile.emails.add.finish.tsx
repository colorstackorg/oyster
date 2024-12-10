import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';
import { type z } from 'zod';

import { job } from '@oyster/core/member-profile/server';
import {
  OneTimeCode,
  OneTimeCodePurpose,
} from '@oyster/core/member-profile/ui';
import { db } from '@oyster/db';
import { StudentEmail } from '@oyster/types';
import {
  Button,
  ErrorMessage,
  FormField,
  getErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { addEmailCookie } from '@/shared/cookies.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const email = await addEmailCookie.parse(request.headers.get('Cookie'));

  if (!email) {
    return redirect(Route['/profile/emails/add/start']);
  }

  return json({
    email,
  });
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

    toast(session, {
      message: 'Added email address to your profile.',
    });

    return redirect(Route['/profile/emails'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
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

const keys = AddEmailFormData.keyof().enum;

export default function AddEmailPage() {
  const { error, errors } = getErrors(useActionData<typeof action>());
  const { email } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/profile/emails']}>
      <Modal.Header>
        <Modal.Title>Add Email Address</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Please input the 6-digit passcode that you received to complete the
        addition of <span style={{ fontWeight: 700 }}>{email}</span> to your
        profile.
      </Modal.Description>

      <RemixForm className="form" method="post">
        <FormField
          error={errors.code}
          label="Code"
          labelFor={keys.code}
          required
        >
          <Input autoFocus id={keys.code} name={keys.code} required />
        </FormField>

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Verify</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
