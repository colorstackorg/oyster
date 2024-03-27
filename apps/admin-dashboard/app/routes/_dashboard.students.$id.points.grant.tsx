import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
} from '@remix-run/react';
import { z } from 'zod';

import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  Textarea,
  validateForm,
} from '@colorstack/core-ui';
import { CompletedActivity } from '@colorstack/types';

import { Route } from '../shared/constants';
import { db, job } from '../shared/core.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const student = await db
    .selectFrom('students')
    .select(['firstName', 'lastName'])
    .where('id', '=', params.id as string)
    .executeTakeFirst();

  if (!student) {
    throw new Response(null, { status: 404 });
  }

  return json({
    student,
  });
}

const GrantPointsInput = CompletedActivity.pick({
  description: true,
  points: true,
}).extend({
  description: z.string().trim().min(1),
});

type GrantPointsInput = z.infer<typeof GrantPointsInput>;

const GrantPointsKey = GrantPointsInput.keyof().enum;

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    GrantPointsInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Please fix the errors above.',
      errors,
    });
  }

  job('gamification.activity.completed', {
    description: data.description,
    points: data.points,
    studentId: params.id as string,
    type: 'one_off',
  });

  toast(session, {
    message: 'Points granted successfully.',
    type: 'success',
  });

  return redirect(Route.STUDENTS, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function GrantPointsPage() {
  const { student } = useLoaderData<typeof loader>();

  const navigate = useNavigate();

  function onClose() {
    navigate(Route.STUDENTS);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>
          Grant Points to {student.firstName} {student.lastName}
        </Modal.Title>

        <Modal.CloseButton />
      </Modal.Header>

      <GrantPointsForm />
    </Modal>
  );
}

function GrantPointsForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        error={errors.points}
        label="Points"
        labelFor={GrantPointsKey.points}
        required
      >
        <Input
          id={GrantPointsKey.points}
          min={1}
          name={GrantPointsKey.points}
          required
          type="number"
        />
      </Form.Field>

      <Form.Field
        error={errors.description}
        label="Description"
        labelFor={GrantPointsKey.description}
        required
      >
        <Textarea
          id={GrantPointsKey.description}
          minRows={2}
          name={GrantPointsKey.description}
          required
        />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button loading={submitting} type="submit">
          Grant
        </Button>
      </Button.Group>
    </RemixForm>
  );
}
