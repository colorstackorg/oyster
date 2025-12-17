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
import { MemberStatus } from '@oyster/types';
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
import { splitArray } from '@oyster/utils';

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

  const ids = result.data.memberIds;

  const batches = splitArray(ids, 10);

  for (const batch of batches) {
    job('student.batch_update_status', {
      status: MemberStatus.BULK_REMOVED,
      memberIds: batch,
    });
  }

  toast(session, {
    message: `Updating status of ${ids.length} members to ${MemberStatus.BULK_REMOVED} asynchronously.`,
  });

  return redirect(Route['/students'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
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
        User records will remain intact in our database and Airtable, while
        access user account will be deactivated from Slack and Mailchimp will be
        removed.
      </Modal.Description>

      <Callout color="blue">
        Note: This process will run asynchronously and if there are a lot of
        members to update, it may take several hours to fully update them in
        Slack, Mailchimp and Airtable.
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
