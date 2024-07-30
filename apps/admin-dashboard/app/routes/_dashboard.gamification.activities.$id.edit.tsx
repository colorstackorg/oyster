import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { useActionData, useLoaderData } from '@remix-run/react';

import { editActivity } from '@oyster/core/gamification';
import {
  type ActivityPeriod,
  type ActivityType,
  EditActivityInput,
} from '@oyster/core/gamification.types';
import { ActivityForm } from '@oyster/core/gamification.ui';
import { db } from '@oyster/db';
import { getErrors, Modal, validateForm } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const activity = await getActivity(params.id as string);

  return json({
    activity,
  });
}

async function getActivity(id: string) {
  const activity = await db
    .selectFrom('activities')
    .select(['description', 'name', 'period', 'points', 'type'])
    .where('id', '=', id)
    .executeTakeFirst();

  if (!activity) {
    throw new Response(null, { status: 404 });
  }

  return activity;
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(request, EditActivityInput);

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await editActivity({
    description: data.description,
    id: params.id as string,
    name: data.name,
    period: data.period,
    points: data.points,
    type: data.type,
  });

  toast(session, {
    message: 'Edited activity.',
  });

  return redirect(Route['/gamification/activities'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function EditActivityPage() {
  const { activity } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/gamification/activities']}>
      <Modal.Header>
        <Modal.Title>Edit Activity</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <ActivityForm
        activity={{
          ...activity,
          period: activity.period as ActivityPeriod,
          type: activity.type as ActivityType,
        }}
        error={error}
        errors={errors}
      />
    </Modal>
  );
}
