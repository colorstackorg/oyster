import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, generatePath, useActionData, useParams } from '@remix-run/react';
import { z } from 'zod';

import {
  Button,
  ErrorMessage,
  Field,
  getErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import { validateQueue } from '@/shared/bull';
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

  return json({});
}

const AddRepeatableInput = z.object({
  name: z.string().trim().min(1),
  pattern: z.string().trim().min(1),
});

type AddRepeatableInput = z.infer<typeof AddRepeatableInput>;

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const { data, errors, ok } = await validateForm(request, AddRepeatableInput);

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  const queue = await validateQueue(params.queue);

  await queue.add(data.name, undefined, {
    repeat: {
      pattern: data.pattern,
      tz: 'America/Los_Angeles',
    },
  });

  toast(session, {
    message: 'Added repeatable.',
  });

  return redirect(generatePath(Route['/bull/:queue'], { queue: queue.name }), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function AddRepeatablePage() {
  const { queue } = useParams();

  return (
    <Modal
      onCloseTo={generatePath(Route['/bull/:queue'], {
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
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Form className="form" method="post">
      <Field error={errors.name} label="Name" labelFor={keys.name} required>
        <Input id={keys.name} name={keys.name} required />
      </Field>

      <Field
        description="Please format the job to be in the PT timezone."
        error={errors.pattern}
        label="Pattern (CRON)"
        labelFor={keys.pattern}
        required
      >
        <Input id={keys.pattern} name={keys.pattern} required />
      </Field>

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Group>
        <Button.Submit>Add</Button.Submit>
      </Button.Group>
    </Form>
  );
}
