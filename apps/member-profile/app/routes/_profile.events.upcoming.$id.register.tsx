import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useLoaderData } from '@remix-run/react';
import { Calendar, Check, ExternalLink } from 'react-feather';

import { Button, getButtonCn, Modal, Text } from '@oyster/ui';

import { formatEventDate } from '@/shared/components/event';
import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { db, getEvent, job } from '@/shared/core.server';
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

  return json({
    event,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await registerForEvent({
    eventId: params.id as string,
    studentId: user(session),
  });

  toast(session, {
    message: 'Registered!',
    type: 'success',
  });

  return redirect(Route['/events'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

async function registerForEvent({
  eventId,
  studentId,
}: {
  eventId: string;
  studentId: string;
}) {
  const student = await db
    .selectFrom('students')
    .select(['email'])
    .where('id', '=', studentId)
    .executeTakeFirstOrThrow();

  await db
    .insertInto('eventRegistrations')
    .values({
      email: student.email,
      eventId,
      registeredAt: new Date(),
      studentId,
    })
    .onConflict((oc) => oc.doNothing())
    .execute();

  job('event.register', {
    eventId,
    studentId,
  });
}

export default function EventRegisterPage() {
  const { event } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/events/upcoming']}>
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

      <RemixForm className="form" method="post">
        <Button.Group>
          {event.externalLink && (
            <a
              className={getButtonCn({ variant: 'secondary' })}
              href={event.externalLink}
              target="_blank"
            >
              <ExternalLink className="h-5 w-5" /> See Details
            </a>
          )}

          {!event.isRegistered && (
            <Button.Submit>
              <Check className="h-5 w-5" /> Register
            </Button.Submit>
          )}
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
