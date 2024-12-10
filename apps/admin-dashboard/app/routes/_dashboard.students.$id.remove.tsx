import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';

import { job } from '@oyster/core/admin-dashboard/server';
import { db } from '@oyster/db';
import { BooleanInput } from '@oyster/types';
import { Button, Checkbox, Modal } from '@oyster/ui';

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
    return redirect(Route['/students']);
  }

  return json({
    student,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const student = await db
    .deleteFrom('students')
    .returning(['airtableId', 'email', 'firstName', 'slackId'])
    .where('id', '=', params.id as string)
    .executeTakeFirst();

  if (!student) {
    throw new Response(null, { status: 404 });
  }

  const form = await request.formData();

  const sendViolationEmail = BooleanInput.parse(form.get('sendViolationEmail'));

  job('student.removed', {
    airtableId: student.airtableId as string,
    email: student.email,
    firstName: student.firstName,
    sendViolationEmail,
    slackId: student.slackId,
  });

  toast(session, {
    message: 'Removed member.',
  });

  return redirect(Route['/students'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function RemoveMemberPage() {
  const { student } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/students']}>
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

      <Form className="form" method="post">
        <Checkbox
          color="amber-100"
          defaultChecked={true}
          label="Send a Code of Conduct violation email."
          id="sendViolationEmail"
          name="sendViolationEmail"
          value="1"
        />

        <Button.Group>
          <Button color="error" type="submit">
            Remove
          </Button>
        </Button.Group>
      </Form>
    </Modal>
  );
}

export function ErrorBoundary() {
  return <></>;
}
