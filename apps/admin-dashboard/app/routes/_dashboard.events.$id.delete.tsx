import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';

import { deleteEvent, getEvent } from '@oyster/core/events';
import { Button, ErrorMessage, getErrors, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const event = await getEvent(params.id as string, ['events.name']);

  if (!event) {
    throw new Response(null, { status: 404 });
  }

  return json({
    event,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await deleteEvent(params.id as string);

  toast(session, {
    message: 'Event was deleted.',
  });

  return redirect(Route['/events'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function DeleteEventModal() {
  const { event } = useLoaderData<typeof loader>();
  const { error } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/events']}>
      <Modal.Header>
        <Modal.Title>Delete Event: {event.name}</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Are you sure you want to delete this event? This will not only delete
        the event, but all associated registrations, attendees and more. This
        action cannot be undone.
      </Modal.Description>

      <Form className="form" method="post">
        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit color="error">Delete</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
