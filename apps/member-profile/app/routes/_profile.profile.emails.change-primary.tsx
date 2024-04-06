import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
} from '@remix-run/react';
import { z } from 'zod';

import { Student } from '@oyster/types';
import {
  Button,
  Form,
  getActionErrors,
  Modal,
  Select,
  validateForm,
} from '@oyster/ui';

import { Route } from '../shared/constants';
import { db, job, listEmails } from '../shared/core.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const emails = await listEmails(user(session));

  return json({
    emails,
  });
}

const ChangePrimaryEmailInput = Student.pick({
  email: true,
});

type ChangePrimaryEmailInput = z.infer<typeof ChangePrimaryEmailInput>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    ChangePrimaryEmailInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
  }

  try {
    await changePrimaryEmail(user(session), data);

    toast(session, {
      message: 'Your primary email address was updated.',
      type: 'success',
    });

    return redirect(Route['/profile/emails'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json({
      error: (e as Error).message,
      errors,
    });
  }
}

async function changePrimaryEmail(id: string, input: ChangePrimaryEmailInput) {
  const student = await db
    .selectFrom('students')
    .select(['email'])
    .where('id', '=', id)
    .executeTakeFirstOrThrow();

  if (input.email === student.email) {
    throw new Error('This is already your primary email.');
  }

  const studentEmail = await db
    .selectFrom('studentEmails')
    .where('email', 'ilike', input.email)
    .executeTakeFirst();

  if (!studentEmail) {
    throw new Error('The email you are trying to make primary was not found.');
  }

  const previousEmail = student.email;

  await db
    .updateTable('students')
    .set({ email: input.email })
    .where('id', '=', id)
    .execute();

  job('member_email.primary.changed', {
    previousEmail,
    studentId: id,
  });
}

const { email } = ChangePrimaryEmailInput.keyof().enum;

export default function ChangePrimaryEmailPage() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());
  const { emails } = useLoaderData<typeof loader>();

  const navigate = useNavigate();

  const submitting = useNavigation().state === 'submitting';

  function onClose() {
    navigate(Route['/profile/emails']);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Change Primary Email Address</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Changing your primary email address will update the email address on
        your Slack account, as well as where all future weekly newsletters will
        be sent to.
      </Modal.Description>

      <RemixForm className="form" method="post">
        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Form.Field
          description="If you don't see your email listed here, please add it to your profile first."
          error={errors.email}
          label="Email"
          labelFor={email}
          required
        >
          <Select id={email} name={email} required>
            {emails.map((email) => {
              return (
                <option
                  disabled={!!email.primary}
                  key={email.email}
                  value={email.email!}
                >
                  {email.email}
                </option>
              );
            })}
          </Select>
        </Form.Field>

        <Button.Group>
          <Button loading={submitting} type="submit">
            Save
          </Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
