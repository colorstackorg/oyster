import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { Calendar, Check, ExternalLink } from 'react-feather';

import { formatEventDate, getEvent } from '@oyster/core/events';
import { registerForEvent } from '@oyster/core/events/registrations';
import { Button, Modal, Text } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const timezone = getTimezone(request);

  const result = await getEvent(
    params.id as string,
    [
      'events.description',
      'events.endTime',
      'events.externalLink',
      'events.name',
      'events.startTime',
    ],
    {
      memberId: user(session),
      type: 'virtual',
      withIsRegistered: true,
    }
  );

  if (!result) {
    throw new Response(null, { status: 404 });
  }

  const date = formatEventDate(
    { endTime: result.endTime, startTime: result.startTime },
    { format: 'long', timezone }
  );

  const event = {
    ...result,
    date,
  };

  return {
    event,
  };
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await registerForEvent({
    eventId: params.id as string,
    studentId: user(session),
  });

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'Registered!',
  });

  return redirect(Route['/events'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function EventRegisterPage() {
  const { event } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/events']}>
      <Modal.Header>
        <Modal.Title>{event.name}</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <div className="flex gap-2">
        <Calendar className="h-5 w-5 text-gray-500" />
        <Text color="gray-500" variant="sm">
          {event.date}
        </Text>
      </div>

      {event.isRegistered ? (
        <Text color="gray-500">
          It looks like you are already registered for this event. Your link to
          join the event should have been sent to your email. We can't wait to
          see you! 🥳
        </Text>
      ) : (
        <Text color="gray-500">
          Once you register, you will receive a confirmation email with a link
          to join the event. We can't wait to see you! 🥳
        </Text>
      )}

      <Form className="form" method="post">
        <Button.Group>
          {event.externalLink && (
            <Button.Slot variant="secondary">
              <a href={event.externalLink} target="_blank">
                <ExternalLink className="h-5 w-5" /> See Details
              </a>
            </Button.Slot>
          )}

          {!event.isRegistered && (
            <Button.Submit>
              <Check className="h-5 w-5" /> Register
            </Button.Submit>
          )}
        </Button.Group>
      </Form>
    </Modal>
  );
}
