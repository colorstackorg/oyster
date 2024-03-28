import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigate,
  useNavigation,
} from '@remix-run/react';

import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/core-ui';

import { addIcebreakerPrompt } from '../shared/core.server';
import { AddIcebreakerPromptInput } from '../shared/core.ui';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

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
  const navigate = useNavigate();

  function onClose() {
    navigate(-1);
  }

  return (
    <Modal onClose={onClose}>
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

  const submitting = useNavigation().state === 'submitting';

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
        <Button loading={submitting} type="submit">
          Add
        </Button>
      </Button.Group>
    </RemixForm>
  );
}
