import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';

import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import { createSchool } from '@/admin-dashboard.server';
import { CreateSchoolInput } from '@/admin-dashboard.ui';
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

  const { data, errors } = await validateForm(request, CreateSchoolInput);

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
  }

  await createSchool({
    addressCity: data.addressCity,
    addressState: data.addressState,
    addressZip: data.addressZip,
    name: data.name,
  });

  toast(session, {
    message: `Created ${data.name}.`,
    type: 'success',
  });

  return redirect(Route['/schools'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function CreateSchoolPage() {
  return (
    <Modal onCloseTo={Route['/schools']}>
      <Modal.Header>
        <Modal.Title>Create School</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <CreateSchoolForm />
    </Modal>
  );
}

const keys = CreateSchoolInput.keyof().enum;

function CreateSchoolForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        error={errors.name}
        label="Name"
        labelFor={keys.name}
        required
      >
        <Input
          id={keys.name}
          name={keys.name}
          placeholder="University of California, Los Angeles"
          required
        />
      </Form.Field>

      <Form.Field
        error={errors.addressCity}
        label="City"
        labelFor={keys.addressCity}
        required
      >
        <Input
          id={keys.addressCity}
          name={keys.addressCity}
          placeholder="Los Angeles"
          required
        />
      </Form.Field>

      <Form.Field
        description="Please use the two-letter abbreviation."
        error={errors.addressState}
        label="State"
        labelFor={keys.addressState}
        required
      >
        <Input
          id={keys.addressState}
          name={keys.addressState}
          placeholder="CA"
          required
        />
      </Form.Field>

      <Form.Field
        error={errors.addressZip}
        label="Zip Code"
        labelFor={keys.addressZip}
        required
      >
        <Input
          id={keys.addressZip}
          name={keys.addressZip}
          placeholder="90210"
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
