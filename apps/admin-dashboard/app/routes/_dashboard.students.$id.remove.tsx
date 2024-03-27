import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useLoaderData,
  useNavigate,
} from '@remix-run/react';

import { Button, Modal } from '@colorstack/core-ui';

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
    return redirect(Route.STUDENTS);
  }

  return json({
    student,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const student = await db
    .deleteFrom('students')
    .returning(['email', 'slackId'])
    .where('id', '=', params.id as string)
    .executeTakeFirst();

  if (!student) {
    throw new Response(null, { status: 404 });
  }

  job('student.removed', {
    email: student.email,
    slackId: student.slackId,
  });

  toast(session, {
    message: 'Removed member.',
    type: 'success',
  });

  return redirect(Route.STUDENTS, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function RemoveMemberPage() {
  const { student } = useLoaderData<typeof loader>();

  const navigate = useNavigate();

  function onClose() {
    navigate(Route.STUDENTS);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>
          Remove {student.firstName} {student.lastName}
        </Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        This is not an undoable action. All of their engagement records will be
        deleted and they will be removed from Slack, Mailchimp and Airtable. Are
        you sure want to remove this member?
      </Modal.Description>

      <RemixForm className="form" method="post">
        <Button.Group>
          <Button color="error" type="submit">
            Remove
          </Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}

export function ErrorBoundary() {
  return <></>;
}
