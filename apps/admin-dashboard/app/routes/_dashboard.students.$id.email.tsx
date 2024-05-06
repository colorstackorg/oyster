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

import { db } from '@oyster/db';
import { Student } from '@oyster/types';
import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import { updateMemberEmail } from '@/admin-dashboard.server';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const student = await db
    .selectFrom('students')
    .select(['firstName', 'lastName'])
    .where('id', '=', params.id as string)
    .executeTakeFirst();

  if (!student) {
    throw new Response(null, { status: 404 });
  }

  return json({
    student,
  });
}

const UpdateStudentEmailInput = Student.pick({
  email: true,
});

type UpdateStudentEmailInput = z.infer<typeof UpdateStudentEmailInput>;

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    UpdateStudentEmailInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Please fix the errors above.',
      errors,
    });
  }

  const result = await updateMemberEmail({
    email: data.email,
    id: params.id as string,
  });

  if (result instanceof Error) {
    return json({
      error: result.message,
      errors,
    });
  }

  toast(session, {
    message: 'Updated member email.',
    type: 'success',
  });

  return redirect(Route['/students'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function UpdateStudentEmailPage() {
  const { student } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/students']}>
      <Modal.Header>
        <Modal.Title>
          Update Email - {student.firstName} {student.lastName}
        </Modal.Title>

        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Are you sure you want to update the email of this member? They will
        receive any email communications here going forward.
      </Modal.Description>

      <UpdateStudentEmailForm />
    </Modal>
  );
}

const keys = UpdateStudentEmailInput.keyof().enum;

function UpdateStudentEmailForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        error={errors.email}
        label="Email"
        labelFor={keys.email}
        required
      >
        <Input id={keys.email} name={keys.email} required />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Update</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
