import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { z } from 'zod';

import { job } from '@oyster/core/bull';
import {
  Button,
  ErrorMessage,
  Field,
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

  return null;
}

const SyncAirmeetEventFormData = z.object({
  eventId: z.string().uuid('The ID must be a valid UUID.'),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, SyncAirmeetEventFormData);

  if (!result.ok) {
    return json(result, { status: 400 });
  }

  job('event.sync', {
    eventId: result.data.eventId,
  });

  toast(session, {
    message: 'Event is being synced. Check back soon.',
  });

  return redirect(Route['/events'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function SyncAirmeetEventPage() {
  return (
    <Modal onCloseTo={Route['/events']}>
      <Modal.Header>
        <Modal.Title>Sync Airmeet Event</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <SyncAirmeetEventForm />
    </Modal>
  );
}

const keys = SyncAirmeetEventFormData.keyof().enum;

function SyncAirmeetEventForm() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Form className="form" method="post">
      <Field
        description="You can find the ID from the Airmeet event URL."
        error={errors.eventId}
        label="Airmeet ID"
        labelFor={keys.eventId}
        required
      >
        <Input id={keys.eventId} name={keys.eventId} required />
      </Field>

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Group>
        <Button.Submit>Sync</Button.Submit>
      </Button.Group>
    </Form>
  );
}
