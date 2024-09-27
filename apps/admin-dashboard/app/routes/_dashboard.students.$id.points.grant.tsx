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

import { grantPoints } from '@oyster/core/gamification';
import { GrantPointsInput } from '@oyster/core/gamification/types';
import { db } from '@oyster/db';
import {
  Button,
  Form,
  getErrors,
  Input,
  Modal,
  Textarea,
  validateForm,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

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

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    GrantPointsInput.omit({ memberId: true })
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await grantPoints({
    description: data.description,
    memberId: params.id as string,
    points: data.points,
  });

  toast(session, {
    message: 'Points granted successfully.',
  });

  return redirect(Route['/students'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function GrantPointsPage() {
  const { student } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/students']}>
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

const keys = GrantPointsInput.keyof().enum;

function GrantPointsForm() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        error={errors.points}
        label="Points"
        labelFor={keys.points}
        required
      >
        <Input
          id={keys.points}
          min={1}
          name={keys.points}
          required
          type="number"
        />
      </Form.Field>

      <Form.Field
        error={errors.description}
        label="Description"
        labelFor={keys.description}
        required
      >
        <Textarea
          id={keys.description}
          minRows={2}
          name={keys.description}
          required
        />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Grant</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
