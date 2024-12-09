import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';
import { z } from 'zod';

import { job } from '@oyster/core/admin-dashboard/server';
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

const SyncAirmeetEventFormData = z.object({
  eventId: z.string().uuid('The ID must be a valid UUID.'),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    SyncAirmeetEventFormData
  );

  if (!ok) {
    return json({
      error: '',
      errors,
    });
  }

  job('event.sync', {
    eventId: data.eventId,
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
    <RemixForm className="form" method="post">
      <FormField
        description="You can find the ID from the Airmeet event URL."
        error={errors.eventId}
        label="Airmeet ID"
        labelFor={keys.eventId}
        required
      >
        <Input id={keys.eventId} name={keys.eventId} required />
      </FormField>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Sync</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
