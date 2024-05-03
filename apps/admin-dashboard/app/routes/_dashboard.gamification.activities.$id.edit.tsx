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
import { type z } from 'zod';

import { db } from '@oyster/db';
import { Activity, type ActivityPeriod } from '@oyster/types';
import { Button, Form, getErrors, Modal, validateForm } from '@oyster/ui';

import { editActivity } from '@/admin-dashboard.server';
import { ActivityForm } from '@/shared/components/activity-form';
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

const EditActivityInput = Activity.pick({
  description: true,
  name: true,
  period: true,
  points: true,
  type: true,
});

type EditActivityInput = z.infer<typeof EditActivityInput>;

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(request, EditActivityInput);

  if (!ok) {
    return json({ errors });
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
    type: 'success',
  });

  return redirect(Route['/gamification/activities'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const keys = EditActivityInput.keyof().enum;

export default function EditActivityPage() {
  const { activity } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/gamification/activities']}>
      <Modal.Header>
        <Modal.Title>Edit Activity</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <ActivityForm.NameField
          defaultValue={activity.name}
          error={errors.name}
          name={keys.name}
        />

        <ActivityForm.DescriptionField
          defaultValue={activity.description || undefined}
          error={errors.description}
          name={keys.description}
        />

        <ActivityForm.TypeField
          defaultValue={(activity.type as Activity['type']) || undefined}
          error={errors.type}
          name={keys.type}
        />

        <ActivityForm.PeriodField
          defaultValue={(activity.period as ActivityPeriod) || undefined}
          error={errors.period}
          name={keys.period}
        />

        <ActivityForm.PointsField
          defaultValue={activity.points}
          error={errors.points}
          name={keys.points}
        />

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button type="submit">Edit</Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
