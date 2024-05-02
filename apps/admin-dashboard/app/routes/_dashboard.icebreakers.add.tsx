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

import { Route } from '@/shared/constants';
import { addIcebreakerPrompt } from '@/shared/core.server';
import { AddIcebreakerPromptInput } from '@/shared/core.ui';
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

  const form = await request.formData();

  const { data, errors } = validateForm(
    AddIcebreakerPromptInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  await addIcebreakerPrompt(data);

  toast(session, {
    message: 'Added icebreaker prompt.',
    type: 'success',
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
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        error={errors.text}
        label="Prompt"
        labelFor={keys.text}
        required
      >
        <Input id={keys.text} name={keys.text} required />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Add</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
