import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { type z } from 'zod';

import { updateMemberEmail } from '@oyster/core/admin-dashboard/server';
import { db } from '@oyster/db';
import { Student } from '@oyster/types';
import {
  Button,
  ErrorMessage,
  Field,
  getErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

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

  const result = await validateForm(request, UpdateStudentEmailInput);

  if (!result.ok) {
    return json(result, { status: 400 });
  }

  const updateResult = await updateMemberEmail({
    email: result.data.email,
    id: params.id as string,
  });

  if (updateResult instanceof Error) {
    return json({ error: updateResult.message }, { status: 500 });
  }

  toast(session, {
    message: 'Updated member email.',
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
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Form className="form" method="post">
      <Field error={errors.email} label="Email" labelFor={keys.email} required>
        <Input id={keys.email} name={keys.email} required />
      </Field>

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Group>
        <Button.Submit>Update</Button.Submit>
      </Button.Group>
    </Form>
  );
}
