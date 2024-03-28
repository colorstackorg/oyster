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

import { StudentEmail } from '@oyster/types';
import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import { Route } from '../shared/constants';
import { addEmailCookie } from '../shared/cookies.server';
import { db, job } from '../shared/core.server';
import { OneTimeCode, OneTimeCodePurpose } from '../shared/core.ui';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const email = await addEmailCookie.parse(request.headers.get('Cookie'));

  if (!email) {
    return redirect(Route.ADD_EMAIL_START);
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

  const form = await request.formData();

  const { data, errors } = validateForm(
    AddEmailFormData,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
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

const { code } = AddEmailFormData.keyof().enum;

export default function AddEmailPage() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());
  const { email } = useLoaderData<typeof loader>();

  const navigate = useNavigate();

  const submitting = useNavigation().state === 'submitting';

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
        Please input the 6-digit passcode that you received to complete the
        addition of <span style={{ fontWeight: 700 }}>{email}</span> to your
        profile.
      </Modal.Description>

      <RemixForm className="form" method="post">
        <Form.Field error={errors.code} label="Code" labelFor={code} required>
          <Input autoFocus id={code} name={code} required />
        </Form.Field>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button loading={submitting} type="submit">
            Verify
          </Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
