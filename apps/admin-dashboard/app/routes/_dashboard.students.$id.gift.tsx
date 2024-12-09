import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';
import { z } from 'zod';

import { createGoodyOrder } from '@oyster/core/goody';
import { db } from '@oyster/db';
import {
  Button,
  Form,
  FormField,
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

  const member = await db
    .selectFrom('students')
    .where('id', '=', params.id as string)
    .executeTakeFirst();

  if (!member) {
    return redirect(Route['/students']);
  }

  return json({});
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const {
    data,
    errors: _,
    ok,
  } = await validateForm(
    request,
    z.object({ message: z.string().trim().min(1) })
  );

  if (!ok) {
    return json({ error: 'Please enter a message.' }, { status: 400 });
  }

  const member = await db
    .selectFrom('students')
    .select(['email', 'firstName', 'lastName'])
    .where('id', '=', params.id as string)
    .executeTakeFirst();

  if (!member) {
    return redirect(Route['/students']);
  }

  const result = await createGoodyOrder({
    message: data.message,
    recipients: [
      {
        email: member.email,
        first_name: member.firstName,
        last_name: member.lastName,
      },
    ],
  });

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'Sent Goody gift! 🎁',
  });

  return redirect(Route['/students'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function SendGiftModal() {
  const { error } = useActionData<typeof action>() || {};

  return (
    <Modal onCloseTo={Route['/students']}>
      <Modal.Header>
        <Modal.Title>Send Goody Gift</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        This will send a DoorDash gift card to this member.
      </Modal.Description>

      <RemixForm className="form" method="post">
        <FormField
          description="Add a message to the gift so the member knows why they are receiving this."
          label="Message"
          labelFor="message"
          required
        >
          <Textarea
            id="message"
            minRows={3}
            name="message"
            placeholder="Congratulations..."
            required
          />
        </FormField>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Send</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
