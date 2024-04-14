import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigate,
} from '@remix-run/react';
import { type z } from 'zod';

import { Activity } from '@oyster/types';
import { Button, Form, getActionErrors, Modal, validateForm } from '@oyster/ui';
import { id } from '@oyster/utils';

import { ActivityForm } from '../shared/components/activity-form';
import { Route } from '../shared/constants';
import { db } from '../shared/core.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

const CreateActivityInput = Activity.pick({
  description: true,
  name: true,
  period: true,
  points: true,
  type: true,
});

type CreateActivityInput = z.infer<typeof CreateActivityInput>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    CreateActivityInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
  }

  await addActivity(data);

  toast(session, {
    message: 'Added a new activity.',
    type: 'success',
  });

  return redirect(Route.ACTIVITIES, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

async function addActivity(input: CreateActivityInput) {
  await db
    .insertInto('activities')
    .values({
      description: input.description,
      name: input.name,
      period: input.period,
      points: input.points,
      id: id(),
      type: input.type,
    })
    .execute();
}

const { description, name, period, points, type } =
  CreateActivityInput.keyof().enum;

export default function AddActivityPage() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const navigate = useNavigate();

  function onClose() {
    navigate(Route.ACTIVITIES);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Add Activity</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <ActivityForm.NameField error={errors.name} name={name} />
        <ActivityForm.DescriptionField
          error={errors.description}
          name={description}
        />
        <ActivityForm.TypeField error={errors.type} name={type} />
        <ActivityForm.PeriodField error={errors.period} name={period} />
        <ActivityForm.PointsField error={errors.points} name={points} />

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button type="submit">Add</Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
