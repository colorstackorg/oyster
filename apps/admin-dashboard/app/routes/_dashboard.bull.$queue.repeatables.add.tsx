import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  generatePath,
  Form as RemixForm,
  useActionData,
  useNavigate,
  useNavigation,
} from '@remix-run/react';
import { z } from 'zod';

import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import { Route } from '../shared/constants';
import { QueueFromName } from '../shared/core.server';
import { BullQueue } from '../shared/core.ui';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

const BullParams = z.object({
  queue: z.nativeEnum(BullQueue),
});

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

const AddRepeatableInput = z.object({
  name: z.string().trim().min(1),
  pattern: z.string().trim().min(1),
});

type AddRepeatableInput = z.infer<typeof AddRepeatableInput>;

const AddRepeatableKey = AddRepeatableInput.keyof().enum;

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    AddRepeatableInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Please fix the errors above.',
      errors,
    });
  }

  const { queue: queueName } = BullParams.parse(params);

  const queue = QueueFromName[queueName];

  await queue.add(data.name, undefined, {
    repeat: {
      pattern: data.pattern,
      tz: 'America/Los_Angeles',
    },
  });

  toast(session, {
    message: 'Added repeatable.',
    type: 'success',
  });

  return redirect(generatePath(Route.BULL_REPEATABLES, { queue: queueName }), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function AddRepeatablePage() {
  const navigate = useNavigate();

  function onClose() {
    navigate(-1);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Add Repeatable</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <AddRepeatableForm />
    </Modal>
  );
}

function AddRepeatableForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        error={errors.name}
        label="Name"
        labelFor={AddRepeatableKey.name}
        required
      >
        <Input
          id={AddRepeatableKey.name}
          name={AddRepeatableKey.name}
          required
        />
      </Form.Field>

      <Form.Field
        description="Please format the job to be in the PT timezone."
        error={errors.pattern}
        label="Pattern (CRON)"
        labelFor={AddRepeatableKey.pattern}
        required
      >
        <Input
          id={AddRepeatableKey.pattern}
          name={AddRepeatableKey.pattern}
          required
        />
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
