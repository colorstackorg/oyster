import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';
import { Check } from 'react-feather';

import { checkIntoEvent } from '@oyster/core/events';
import { getEvent } from '@oyster/core/member-profile.server';
import { Button, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const event = await getEvent(
    params.id as string,
    ['events.endTime', 'events.name', 'events.startTime'],
    {
      include: ['isCheckedIn'],
      type: 'irl',
    }
  );

  if (!event) {
    throw new Response(null, {
      status: 404,
      statusText: 'The event was not found.',
    });
  }

  if (event.startTime > new Date()) {
    throw new Response(null, {
      status: 404,
      statusText: 'This event has not started yet.',
    });
  }

  if (event.endTime < new Date()) {
    throw new Response(null, {
      status: 404,
      statusText: 'This event has already finished.',
    });
  }

  return json({
    event,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await checkIntoEvent({
    eventId: params.id as string,
    memberId: user(session),
  });

  return json({
    checkedIn: true,
  });
}

export default function EventCheckIn() {
  const { event } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const isCheckedIn = event.isCheckedIn || actionData?.checkedIn;

  return (
    <Modal onCloseTo={Route['/events/upcoming']} size="400">
      <Modal.Header>
        <Modal.Title>{event.name}: Check In! 👋</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      {isCheckedIn ? (
        <>
          <Modal.Description>
            Thanks for checking in, have a blast!
          </Modal.Description>

          <img
            alt="Snoop Dogg ready to party..."
            className="rounded"
            src="/images/snoop.gif"
          />
        </>
      ) : (
        <>
          <Modal.Description>
            Thanks for stopping by! Hit that check in button so we know you made
            it!
          </Modal.Description>

          <RemixForm className="form mt-4" method="post">
            <Button.Submit fill>
              <Check className="h-5 w-5" /> Check In!
            </Button.Submit>
          </RemixForm>
        </>
      )}
    </Modal>
  );
}
