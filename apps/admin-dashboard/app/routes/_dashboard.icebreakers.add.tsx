import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';

import { addIcebreakerPrompt } from '@oyster/core/admin-dashboard/server';
import { AddIcebreakerPromptInput } from '@oyster/core/admin-dashboard/ui';
import {
  Button,
  Form,
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

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    AddIcebreakerPromptInput
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await addIcebreakerPrompt(data);

  toast(session, {
    message: 'Added icebreaker prompt.',
  });

  return redirect('/icebreakers/add', {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function AddIcebreakerPromptPage() {
  return (
    <Modal onCloseTo={Route['/']}>
      <Modal.Header>
        <Modal.Title>Add Icebreaker Prompt</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <AddIcebreakerPromptForm />
    </Modal>
  );
}

const keys = AddIcebreakerPromptInput.keyof().enum;

function AddIcebreakerPromptForm() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <FormField
        error={errors.text}
        label="Prompt"
        labelFor={keys.text}
        required
      >
        <Input id={keys.text} name={keys.text} required />
      </FormField>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Add</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
