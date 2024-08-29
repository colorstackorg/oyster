import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { useActionData } from '@remix-run/react';
import { Form as RemixForm } from '@remix-run/react';

import { askQuestionToSlack } from '@oyster/core/slack';
import { Button, Divider, Form, Modal, Text, Textarea } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const result = await askQuestionToSlack(form.get('question') as string);

  if (!result.ok) {
    return json(result, { status: 400 });
  }

  return json(result);
}

export default function AskSlackQuestion() {
  const actionData = useActionData<typeof action>();

  return (
    <Modal onCloseTo={Route['/profile/referrals']}>
      <Modal.Header>
        <Modal.Title>Ask Slack</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <Form.Field
          description="Ask a question based on our Slack history!"
          labelFor="question"
          required
        >
          <Textarea id="question" name="question" required />
        </Form.Field>

        <Form.ErrorMessage>
          {actionData && !actionData.ok ? actionData.error : undefined}
        </Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Get Answer</Button.Submit>
        </Button.Group>
      </RemixForm>

      {actionData && actionData.ok && (
        <>
          <Divider my="4" />
          <Text className="whitespace-pre-wrap">
            {actionData.data as string}
          </Text>
        </>
      )}
    </Modal>
  );
}
