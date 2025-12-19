import { useState } from 'react';
import {
  type ActionFunctionArgs,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useLoaderData,
} from 'react-router';

import { job } from '@oyster/core/bull';
import { db } from '@oyster/db';
import { BooleanInput, MemberStatus } from '@oyster/types';
import { Button, Checkbox, Field, Modal, Select } from '@oyster/ui';

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
    .select(['firstName', 'lastName', 'status'])
    .where('id', '=', params.id as string)
    .executeTakeFirst();

  if (!student) {
    return redirect(Route['/students']);
  }

  return {
    student,
  };
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const student = await db
    .selectFrom('students')
    .select(['airtableId', 'email', 'firstName', 'lastName', 'id', 'slackId'])
    .where('id', '=', params.id as string)
    .executeTakeFirst();

  if (!student) {
    throw new Response(null, { status: 404 });
  }

  const form = await request.formData();

  const status = form.get('status') as string;
  const sendViolationEmail =
    status === MemberStatus.INACTIVE
      ? BooleanInput.parse(form.get('sendViolationEmail'))
      : false;

  job('student.batch_update_status', {
    memberIds: [student.id],
    status: status as (typeof MemberStatus)[keyof typeof MemberStatus],
    sendViolationEmail,
  });

  const statusLabel = status === MemberStatus.ACTIVE ? 'active' : 'inactive';

  toast(session, {
    message: `Marked member ${student.firstName} ${student.lastName} as ${statusLabel}.`,
  });

  return redirect(Route['/students'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function UpdateStatusPage() {
  const { student } = useLoaderData<typeof loader>();

  const [selectedStatus, setSelectedStatus] = useState<string>(
    student.status === MemberStatus.ACTIVE
      ? MemberStatus.INACTIVE
      : MemberStatus.ACTIVE
  );

  const isMarkingInactive = selectedStatus === MemberStatus.INACTIVE;

  return (
    <Modal onCloseTo={Route['/students']}>
      <Modal.Header>
        <Modal.Title>
          Update {student.firstName} {student.lastName} Status
        </Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        {isMarkingInactive
          ? 'This will mark the member as inactive, which disables their access to the ColorStack platform, Mailchimp, and Slack. If they have violated the Code of Conduct and you would like to send a violation email, please check the box below.'
          : 'This will mark the member as active, which restores their access to the ColorStack platform, Mailchimp, and Slack.'}
      </Modal.Description>

      <Form className="form" method="post">
        <Field label="Status" labelFor="status" required>
          <Select
            id="status"
            name="status"
            required
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.currentTarget.value)}
          >
            {student.status !== MemberStatus.ACTIVE && (
              <option value={MemberStatus.ACTIVE}>Active</option>
            )}
            {student.status !== MemberStatus.INACTIVE && (
              <option value={MemberStatus.INACTIVE}>Inactive</option>
            )}
          </Select>
        </Field>

        {isMarkingInactive && (
          <Checkbox
            color="amber-100"
            defaultChecked={true}
            label="Send a Code of Conduct violation email."
            id="sendViolationEmail"
            name="sendViolationEmail"
            value="1"
          />
        )}

        <Button.Group>
          <Button color={isMarkingInactive ? 'error' : 'primary'} type="submit">
            {isMarkingInactive ? 'Mark as Inactive' : 'Mark as Active'}
          </Button>
        </Button.Group>
      </Form>
    </Modal>
  );
}

export function ErrorBoundary() {
  return <></>;
}
