import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
  useLoaderData,
} from 'react-router';

import { editActivity } from '@oyster/core/gamification';
import {
  type ActivityType,
  EditActivityInput,
} from '@oyster/core/gamification/types';
import { ActivityForm } from '@oyster/core/gamification/ui';
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

  return {
    activity,
  };
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

  const result = await validateForm(request, EditActivityInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  await editActivity({
    ...result.data,
    id: params.id as string,
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
          type: activity.type as ActivityType,
        }}
        error={error}
        errors={errors}
      />
    </Modal>
  );
}
