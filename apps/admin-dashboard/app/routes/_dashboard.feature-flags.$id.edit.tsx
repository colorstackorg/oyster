import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';

import {
  editFeatureFlag,
  getFeatureFlag,
} from '@oyster/core/admin-dashboard/server';
import { EditFeatureFlagInput } from '@oyster/core/admin-dashboard/ui';
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

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const flag = await getFeatureFlag({
    select: ['displayName', 'description', 'enabled'],
    where: { id: params.id as string },
  });

  if (!flag) {
    throw new Response(null, { status: 404 });
  }

  return {
    flag,
  };
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const result = await validateForm(request, EditFeatureFlagInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  await editFeatureFlag(params.id as string, result.data);

  toast(session, {
    message: 'Edited feature flag.',
  });

  return redirect(Route['/feature-flags'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const keys = EditFeatureFlagInput.keyof().enum;

export default function EditFeatureFlagModal() {
  const { flag } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/feature-flags']}>
      <Modal.Header>
        <Modal.Title>Edit Flag</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        <Field
          description="This is the name that will be displayed in the UI."
          error={errors.displayName}
          label="Display Name"
          labelFor={keys.displayName}
          required
        >
          <Input
            defaultValue={flag.displayName}
            id={keys.displayName}
            name={keys.displayName}
            required
          />
        </Field>

        <Field
          description="An optional, but recommended, description of what the flag is for."
          error={errors.description}
          label="Description"
          labelFor={keys.description}
        >
          <Textarea
            defaultValue={flag.description || undefined}
            id={keys.description}
            minRows={2}
            name={keys.description}
          />
        </Field>

        <Checkbox
          color="lime-100"
          defaultChecked={flag.enabled}
          label="Enable the flag. ⛳️"
          id={keys.enabled}
          name={keys.enabled}
          value="1"
        />

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Edit</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
