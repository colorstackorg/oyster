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
  useParams,
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

  return redirect(
    generatePath(Route['/bull/:queue/repeatables'], { queue: queueName }),
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

export default function AddRepeatablePage() {
  const { queue } = useParams();

  return (
    <Modal
      onCloseTo={generatePath(Route['/bull/:queue/repeatables'], {
        queue: queue as string,
      })}
    >
      <Modal.Header>
        <Modal.Title>Add Repeatable</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <AddRepeatableForm />
    </Modal>
  );
}

const keys = AddRepeatableInput.keyof().enum;

function AddRepeatableForm() {
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

      <Form.Field
        description="Please format the job to be in the PT timezone."
        error={errors.pattern}
        label="Pattern (CRON)"
        labelFor={keys.pattern}
        required
      >
        <Input id={keys.pattern} name={keys.pattern} required />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Add</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
