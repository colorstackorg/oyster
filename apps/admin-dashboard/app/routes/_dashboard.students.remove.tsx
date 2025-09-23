import {
  type ActionFunctionArgs,
  data,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
} from 'react-router';
import z from 'zod';

import { job } from '@oyster/core/bull';
import { db } from '@oyster/db';
import {
  Button,
  ErrorMessage,
  Field,
  getErrors,
  Modal,
  Textarea,
  validateForm,
} from '@oyster/ui';
import { Callout } from '@oyster/ui/callout';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return {};
}

const RemoveMembersFormData = z.object({
  memberIds: z
    .string()
    .min(1)
    .transform((value) => value.split('\n').filter(Boolean)),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const result = await validateForm(form, RemoveMembersFormData);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  const count = await removeMembers(result.data.memberIds);

  toast(session, {
    message: `Removed ${count} members.`,
  });

  return redirect(Route['/students'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

async function removeMembers(ids: string[]): Promise<number> {
  const students = await db
    .deleteFrom('students')
    .where('id', 'in', ids)
    .returning(['airtableId', 'email', 'firstName', 'slackId'])
    .execute();

  for (const student of students) {
    job('student.removed', {
      airtableId: student.airtableId as string,
      email: student.email,
      firstName: student.firstName,
      sendViolationEmail: false,
      slackId: student.slackId,
    });
  }

  return students.length;
}

export default function RemoveMembersPage() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/students']}>
      <Modal.Header>
        <Modal.Title>Bulk Remove Members</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        This action is not reversible. All of their engagement records will be
        deleted and they will be removed from Slack, Mailchimp and Airtable.
      </Modal.Description>

      <Callout color="blue">
        Note: These members will immediately be removed from our database, but
        it may take some time for them to be removed from Slack, Mailchimp and
        Airtable.
      </Callout>

      <Form className="form" method="post">
        <ErrorMessage>{error}</ErrorMessage>

        <Field
          description="Please list the IDs of the members to remove separated by a newline."
          error={errors.memberIds}
          label="Member IDs"
          labelFor="memberIds"
          required
        >
          <Textarea
            id="memberIds"
            maxRows={10}
            minRows={10}
            name="memberIds"
            required
          />
        </Field>

        <Button.Group>
          <Button.Submit color="error">Remove</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}

export function ErrorBoundary() {
  return <></>;
}
