import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';
import { type z } from 'zod';

import { db } from '@oyster/db';
import { Program } from '@oyster/types';
import {
  Button,
  DatePicker,
  Form,
  getErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';
import { id } from '@oyster/utils';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

const CreateProgramInput = Program.pick({
  endDate: true,
  name: true,
  startDate: true,
});

type CreateProgramInput = z.infer<typeof CreateProgramInput>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, success } = await validateForm(
    request,
    CreateProgramInput
  );

  if (!success) {
    return json({ errors });
  }

  await db
    .insertInto('programs')
    .values({
      endDate: data.endDate,
      id: id(),
      name: data.name,
      startDate: data.startDate,
    })
    .execute();

  toast(session, {
    message: `Created ${data.name}.`,
    type: 'success',
  });

  const url = new URL(request.url);

  const redirectTo = url.searchParams.get('redirect') || Route['/students'];

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function CreateProgramPage() {
  return (
    <Modal onCloseTo={Route['/students']}>
      <Modal.Header>
        <Modal.Title>Create Program</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <CreateProgramForm />
    </Modal>
  );
}

const keys = CreateProgramInput.keyof().enum;

function CreateProgramForm() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        error={errors.name}
        label="Name"
        labelFor={keys.name}
        required
      >
        <Input id={keys.name} name={keys.name} required />
      </Form.Field>

      <Form.Field
        error={errors.startDate}
        label="Start Date"
        labelFor={keys.startDate}
        required
      >
        <DatePicker
          id={keys.startDate}
          name={keys.startDate}
          type="date"
          required
        />
      </Form.Field>

      <Form.Field
        error={errors.endDate}
        label="End Date"
        labelFor={keys.endDate}
        required
      >
        <DatePicker
          id={keys.endDate}
          name={keys.endDate}
          type="date"
          required
        />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Create</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
