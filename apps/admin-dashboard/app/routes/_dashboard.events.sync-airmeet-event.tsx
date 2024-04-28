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
import { z } from 'zod';

import { Event } from '@oyster/types';
import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import { Route } from '../shared/constants';
import { job } from '../shared/core.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

const SyncAirmeetEventFormData = z.object({
  eventId: Event.shape.id,
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    SyncAirmeetEventFormData,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
  }

  const { eventId } = Object.fromEntries(form);

  job('event.sync', {
    eventId: eventId as string,
  });

  toast(session, {
    message: `Airmeet Event Synced.`,
    type: 'success',
  });

  return redirect(Route.EVENTS, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function SyncAirmeetEventPage() {
  const navigate = useNavigate();

  function onClose() {
    navigate(-1);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Sync Airmeet Event</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <SyncAirmeetEventForm />
    </Modal>
  );
}

const { eventId } = SyncAirmeetEventFormData.keyof().enum;

function SyncAirmeetEventForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());
  const submitting = useNavigation().state === 'submitting';

  return (
    <RemixForm>
      <Form.Field
        error={errors.eventId}
        label="Airmeet ID"
        labelFor={eventId}
        required
      >
        <Input id={eventId} name={eventId} required />
      </Form.Field>

      <br />

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button loading={submitting} type="submit">
          Sync Airmeet Event
        </Button>
      </Button.Group>
    </RemixForm>
  );
}
