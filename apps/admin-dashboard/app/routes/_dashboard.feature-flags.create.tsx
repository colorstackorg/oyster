import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';

import { createFeatureFlag } from '@oyster/core/admin-dashboard/server';
import { CreateFeatureFlagInput } from '@oyster/core/admin-dashboard/ui';
import {
  Button,
  Checkbox,
  ErrorMessage,
  Field,
  getErrors,
  Input,
  Modal,
  Textarea,
  validateForm,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const result = await validateForm(request, CreateFeatureFlagInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  await createFeatureFlag(result.data);

  toast(session, {
    message: 'Created feature flag.',
  });

  return redirect(Route['/feature-flags'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const keys = CreateFeatureFlagInput.keyof().enum;

export default function CreateFeatureFlagModal() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/feature-flags']}>
      <Modal.Header>
        <Modal.Title>Create Flag</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        <Field
          description="This should be snake case (ie: all_lower_with_underscores)."
          error={errors.name}
          label="Name"
          labelFor={keys.name}
          required
        >
          <Input autoFocus id={keys.name} name={keys.name} required />
        </Field>

        <Field
          description="This is the name that will be displayed in the UI."
          error={errors.displayName}
          label="Display Name"
          labelFor={keys.displayName}
          required
        >
          <Input id={keys.displayName} name={keys.displayName} required />
        </Field>

        <Field
          description="An optional, but recommended, description of what the flag is for."
          error={errors.description}
          label="Description"
          labelFor={keys.description}
        >
          <Textarea id={keys.description} minRows={2} name={keys.description} />
        </Field>

        <Checkbox
          color="lime-100"
          defaultChecked={true}
          label="Enable the flag. ⛳️"
          id={keys.enabled}
          name={keys.enabled}
          value="1"
        />

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Create</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
