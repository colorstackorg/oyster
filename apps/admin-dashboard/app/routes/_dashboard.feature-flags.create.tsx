import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
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
  Checkbox,
  Form,
  getActionErrors,
  Input,
  Modal,
  Textarea,
  validateForm,
} from '@oyster/ui';

import { Route } from '../shared/constants';
import { createFeatureFlag } from '../shared/core.server';
import { CreateFeatureFlagInput } from '../shared/core.ui';
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
    CreateFeatureFlagInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
  }

  await createFeatureFlag({
    description: data.description,
    displayName: data.displayName,
    enabled: data.enabled,
    name: data.name,
  });

  toast(session, {
    message: 'Created feature flag.',
    type: 'success',
  });

  return redirect(Route['/feature-flags'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const keys = CreateFeatureFlagInput.keyof().enum;

export default function CreateFeatureFlagModal() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const navigate = useNavigate();
  const submitting = useNavigation().state === 'submitting';

  function onClose() {
    navigate(Route['/feature-flags']);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Create Flag</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <Form.Field
          description="This should be snake case (ie: all_lower_with_underscores)."
          error={errors.name}
          label="Name"
          labelFor={keys.name}
          required
        >
          <Input autoFocus id={keys.name} name={keys.name} required />
        </Form.Field>

        <Form.Field
          description="This is the name that will be displayed in the UI."
          error={errors.displayName}
          label="Display Name"
          labelFor={keys.displayName}
          required
        >
          <Input id={keys.displayName} name={keys.displayName} required />
        </Form.Field>

        <Form.Field
          description="An optional, but recommended, description of what the flag is for."
          error={errors.description}
          label="Description"
          labelFor={keys.description}
        >
          <Textarea id={keys.description} minRows={2} name={keys.description} />
        </Form.Field>

        <Checkbox
          color="lime-100"
          defaultChecked={true}
          label="Enable the flag. ⛳️"
          id={keys.enabled}
          name={keys.enabled}
          value="1"
        />

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button loading={submitting} type="submit">
            Create
          </Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
