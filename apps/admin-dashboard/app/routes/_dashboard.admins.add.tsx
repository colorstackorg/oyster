import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';
import { z } from 'zod';

import {
  Button,
  Checkbox,
  Form,
  getErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import { addAdmin } from '@/admin-dashboard.server';
import { AddAdminInput } from '@/admin-dashboard.ui';
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

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, success } = await validateForm(
    request,
    AddAdminInput.extend({
      isAmbassador: z.preprocess(
        (value) => value === '1',
        AddAdminInput.shape.isAmbassador
      ),
    })
  );

  if (!success) {
    return json({ errors });
  }

  const result = await addAdmin(data);

  if (result instanceof Error) {
    return json({
      error: result.message,
    });
  }

  toast(session, {
    message: 'Added admin.',
    type: 'success',
  });

  return redirect(Route['/'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function AddAdminPage() {
  return (
    <Modal onCloseTo={Route['/']}>
      <Modal.Header>
        <Modal.Title>Add Admin</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <AddAdminForm />
    </Modal>
  );
}

const keys = AddAdminInput.keyof().enum;

function AddAdminForm() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        error={errors.firstName}
        label="First Name"
        labelFor={keys.firstName}
        required
      >
        <Input id={keys.firstName} name={keys.firstName} required />
      </Form.Field>

      <Form.Field
        error={errors.lastName}
        label="Last Name"
        labelFor={keys.lastName}
        required
      >
        <Input id={keys.lastName} name={keys.lastName} required />
      </Form.Field>

      <Form.Field
        error={errors.email}
        label="Email"
        labelFor={keys.email}
        required
      >
        <Input id={keys.email} name={keys.email} required />
      </Form.Field>

      <Form.Field
        description="Is this admin an ambassador? Ambassadors will have limited access."
        error={errors.isAmbassador}
        label="Ambassador"
        labelFor={keys.isAmbassador}
        required
      >
        <Checkbox
          color="orange-100"
          label="Yes"
          id={keys.isAmbassador}
          name={keys.isAmbassador}
          value="1"
        />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Add</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
