import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';

import {
  addEventRecordingLink,
  AddEventRecordingLinkInput,
  getEvent,
} from '@oyster/core/events';
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

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const event = await getEvent(params.id as string, ['events.recordingLink']);

  if (!event) {
    throw new Response(null, { status: 404 });
  }

  return {
    event,
  };
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, AddEventRecordingLinkInput);

  if (!result.ok) {
    return data({
      error: 'Something went wrong, please try again to upload event link.',
      errors: result.errors,
    });
  }

  await addEventRecordingLink(params.id as string, result.data);

  toast(session, {
    message: 'Link uploaded successfully.',
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

function AddEventRecordingForm() {
  const { event } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Form className="form" method="post">
      <Field
        description="Please add the full URL of the event recording."
        error={errors.recordingLink}
        label="Recording Link"
        labelFor="recordingLink"
        required
      >
        <Input
          defaultValue={event.recordingLink || undefined}
          id="recordingLink"
          name="recordingLink"
          placeholder="https://www.youtube.com/watch?v=..."
          required
        />
      </Field>

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Group>
        <Button type="submit">Add</Button>
      </Button.Group>
    </Form>
  );
}
