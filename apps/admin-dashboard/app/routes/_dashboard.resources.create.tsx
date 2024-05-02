import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';
import { type z } from 'zod';

import { Resource, ResourceStatus } from '@oyster/types';
import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';
import { id } from '@oyster/utils';

import { Route } from '../shared/constants';
import { db } from '../shared/core.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

const CreateResourceInput = Resource.pick({
  name: true,
});

type CreateResourceInput = z.infer<typeof CreateResourceInput>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    CreateResourceInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
  }

  await db
    .insertInto('resources')
    .values({
      id: id(),
      name: data.name,
      status: ResourceStatus.ACTIVE,
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

export default function CreateResourcePage() {
  return (
    <Modal onCloseTo={Route['/students']}>
      <Modal.Header>
        <Modal.Title>Create Resource</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <CreateResourceForm />
    </Modal>
  );
}

const keys = CreateResourceInput.keyof().enum;

function CreateResourceForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

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

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Create</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
