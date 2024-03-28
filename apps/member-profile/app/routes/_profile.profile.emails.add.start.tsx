import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigate,
  useNavigation,
} from '@remix-run/react';
import { z } from 'zod';

import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/core-ui';
import { id } from '@oyster/utils';

import { Route } from '../shared/constants';
import { addEmailCookie } from '../shared/cookies.server';
import { db, job } from '../shared/core.server';
import { OneTimeCode, OneTimeCodePurpose } from '../shared/core.ui';
import {
  commitSession,
  ensureUserAuthenticated,
  user,
} from '../shared/session.server';

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

  const form = await request.formData();

  const { data, errors } = validateForm(
    SendEmailCodeInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Please fix the errors above.',
      errors,
    });
  }

  try {
    await sendEmailCode(user(session), data);

    return redirect(Route.ADD_EMAIL_FINISH, {
      headers: [
        ['Set-Cookie', await addEmailCookie.serialize(data.email)],
        ['Set-Cookie', await commitSession(session)],
      ],
    });
  } catch (e) {
    return json({
      error: (e as Error).message,
      errors,
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

const { email } = SendEmailCodeInput.keyof().enum;

export default function AddEmailPage() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

  const navigate = useNavigate();

  function onClose() {
    navigate(Route['/profile/emails']);
  }

  return (
    <Modal onClose={onClose}>
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
          labelFor={email}
          required
        >
          <Input
            autoFocus
            id={email}
            name={email}
            placeholder="me@gmail.com"
            required
          />
        </Form.Field>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button loading={submitting} type="submit">
            Send Code
          </Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
