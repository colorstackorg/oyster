import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';
import { z } from 'zod';

import { Event, EventType } from '@oyster/types';
import {
  Button,
  DatePicker,
  Form,
  getActionErrors,
  Input,
  Modal,
  Select,
  Textarea,
  validateForm,
} from '@oyster/ui';
import { toTitleCase } from '@oyster/utils';

import { createEvent } from '@/admin-dashboard.server';
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

const CreateEventInput = Event.pick({
  description: true,
  endTime: true,
  name: true,
  startTime: true,
  type: true,
});

const CreateEventFormData = CreateEventInput.extend({
  timezone: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = await validateForm(form, CreateEventFormData);

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
  }

  const values = Object.fromEntries(form);

  // We get the datetime values directly from the form object instead of the
  // validated/transformed Zod object because Zod does coercion, which forces
  // the timezone of the server. However, we want to use the timezone of the
  // user's browser when forming the datetime string.
  const endTime = values.endTime as string;
  const startTime = values.startTime as string;

  await createEvent({
    description: data.description,
    endTime,
    name: data.name,
    startTime,
    timezone: data.timezone,
    type: data.type,
  });

  toast(session, {
    message: `Created ${data.name}.`,
    type: 'success',
  });

  return redirect(Route['/events'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function CreateEventPage() {
  return (
    <Modal onCloseTo={Route['/events']}>
      <Modal.Header>
        <Modal.Title>Create Event</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <CreateEventForm />
    </Modal>
  );
}

const keys = CreateEventFormData.keyof().enum;

const EVENT_TYPES = Object.values(EventType);

function CreateEventForm() {
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
        error={errors.type}
        label="Type"
        labelFor={keys.type}
        required
      >
        <Select id={keys.type} name={keys.type} required>
          {EVENT_TYPES.map((type) => {
            return (
              <option key={type} value={type}>
                {type === 'irl' ? 'IRL' : toTitleCase(type)}
              </option>
            );
          })}
        </Select>
      </Form.Field>

      <Form.Field
        error={errors.description}
        label="Description"
        labelFor={keys.description}
      >
        <Textarea id={keys.description} minRows={2} name={keys.description} />
      </Form.Field>

      <Form.Field
        error={errors.startTime}
        label="Start Date/Time"
        labelFor={keys.startTime}
        required
      >
        <DatePicker
          id={keys.startTime}
          name={keys.startTime}
          type="datetime-local"
          required
        />
      </Form.Field>

      <Form.Field
        error={errors.endTime}
        label="End Date/Time"
        labelFor={keys.endTime}
        required
      >
        <DatePicker
          id={keys.endTime}
          name={keys.endTime}
          type="datetime-local"
          required
        />
      </Form.Field>

      <input
        name={keys.timezone}
        type="hidden"
        value={new window.Intl.DateTimeFormat().resolvedOptions().timeZone}
      />

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Create</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
