import {
  type ActionFunctionArgs,
  data,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
} from 'react-router';

import {
  sendEmailCode,
  SendEmailCodeInput,
} from '@oyster/core/member-profile/server';
import {
  Button,
  ErrorMessage,
  Field,
  getErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { addEmailCookie } from '@/shared/cookies.server';
import {
  commitSession,
  ensureUserAuthenticated,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, SendEmailCodeInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  try {
    await sendEmailCode(user(session), result.data);

    return redirect(Route['/profile/emails/add/finish'], {
      headers: [
        ['Set-Cookie', await addEmailCookie.serialize(result.data.email)],
        ['Set-Cookie', await commitSession(session)],
      ],
    });
  } catch (e) {
    return data({ error: (e as Error).message }, { status: 500 });
  }
}

export default function AddEmailPage() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/profile/emails']}>
      <Modal.Header>
        <Modal.Title>Add Email Address</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        We will send you a one-time code to verify that you own this email
        address.
      </Modal.Description>

      <Form className="form" method="post">
        <Field error={errors.email} label="Email" labelFor="email" required>
          <Input
            autoFocus
            id="email"
            name="email"
            placeholder="me@gmail.com"
            required
          />
        </Field>

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Send Code</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
