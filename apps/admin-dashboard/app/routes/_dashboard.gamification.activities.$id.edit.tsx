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
  useNavigate,
} from '@remix-run/react';
import { type z } from 'zod';

import { Activity, type ActivityPeriod } from '@oyster/types';
import { Button, Form, getActionErrors, Modal, validateForm } from '@oyster/ui';

import { ActivityForm } from '../shared/components/activity-form';
import { Route } from '../shared/constants';
import { db, editActivity } from '../shared/core.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

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

  const form = await request.formData();

  const { data, errors } = validateForm(
    EditActivityInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
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

  return redirect(Route.ACTIVITIES, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const { description, name, period, points, type } =
  EditActivityInput.keyof().enum;

export default function EditActivityPage() {
  const { activity } = useLoaderData<typeof loader>();
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const navigate = useNavigate();

  function onClose() {
    navigate(Route.ACTIVITIES);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Edit Activity</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <ActivityForm.NameField
          defaultValue={activity.name}
          error={errors.name}
          name={name}
        />

        <ActivityForm.DescriptionField
          defaultValue={activity.description || undefined}
          error={errors.description}
          name={description}
        />

        <ActivityForm.TypeField
          defaultValue={(activity.type as Activity['type']) || undefined}
          error={errors.type}
          name={type}
        />

        <ActivityForm.PeriodField
          defaultValue={(activity.period as ActivityPeriod) || undefined}
          error={errors.period}
          name={period}
        />

        <ActivityForm.PointsField
          defaultValue={activity.points}
          error={errors.points}
          name={points}
        />

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button type="submit">Edit</Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
