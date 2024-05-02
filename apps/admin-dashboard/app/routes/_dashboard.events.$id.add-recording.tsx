import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';

import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import { addEventRecordingLink, getEvent } from '@/admin-dashboard.server';
import { Route } from '../shared/constants';
import { AddEventRecordingLinkInput } from '../shared/core.ui';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const event = await getEvent(params.id as string, ['events.recordingLink']);

  if (!event) {
    throw new Response(null, { status: 404 });
  }

  return json({
    event,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    AddEventRecordingLinkInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again to upload event link.',
      errors,
    });
  }

  await addEventRecordingLink(params.id as string, data);

  toast(session, {
    message: 'Link uploaded successfully.',
    type: 'success',
  });

  return redirect(Route['/events'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function AddEventRecordingModal() {
  return (
    <Modal onCloseTo={Route['/events']}>
      <Modal.Header>
        <Modal.Title>Add Recording</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <AddEventRecordingForm />
    </Modal>
  );
}

const keys = AddEventRecordingLinkInput.keyof().enum;

function AddEventRecordingForm() {
  const { event } = useLoaderData<typeof loader>();
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        description="Please add the full URL of the event recording."
        error={errors.recordingLink}
        label="Recording Link"
        labelFor={keys.recordingLink}
        required
      >
        <Input
          defaultValue={event.recordingLink || undefined}
          id={keys.recordingLink}
          name={keys.recordingLink}
          placeholder="https://www.youtube.com/watch?v=..."
          required
        />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button type="submit">Add</Button>
      </Button.Group>
    </RemixForm>
  );
}
