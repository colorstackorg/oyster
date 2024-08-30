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

import { activateMember } from '@oyster/core/admin-dashboard/server';
import { db } from '@oyster/db';
import { Button, Form, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const student = await getStudent(params.id as string);

  if (!student) {
    return redirect(Route['/students']);
  }

  return json({
    student,
  });
}

async function getStudent(id: string) {
  const row = await db
    .selectFrom('students')
    .select(['firstName', 'lastName'])
    .where('id', '=', id)
    .where('activatedAt', 'is', null)
    .executeTakeFirst();

  return row;
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  try {
    await activateMember(params.id as string);

    toast(session, {
      message: 'Activated student.',
    });

    return redirect(Route['/students'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
}

export default function ActivateStudentPage() {
  const { student } = useLoaderData<typeof loader>();
  const { error } = useActionData<typeof action>() || {};

  const navigate = useNavigate();

  function onBack() {
    navigate(-1);
  }

  return (
    <Modal onCloseTo={Route['/students']}>
      <Modal.Header>
        <Modal.Title>Activate Student</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Just confirming - do you want to activate {student.firstName}{' '}
        {student.lastName}? They will receive an email with the ability to claim
        a swag pack in their profile.
      </Modal.Description>

      <RemixForm className="form" method="post">
        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group flexDirection="row-reverse">
          <Button type="submit">Activate</Button>

          <Button onClick={onBack} type="button" variant="secondary">
            Back
          </Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
