import {
  type ActionFunctionArgs,
  data,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
  useLoaderData,
} from 'react-router';

import { addEmail, AddEmailInput } from '@oyster/core/member-profile/server';
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
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const email = await addEmailCookie.parse(request.headers.get('Cookie'));

  if (!email) {
    return redirect(Route['/profile/emails/add/start']);
  }

  return { email };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(
    request,
    AddEmailInput.pick({ code: true })
  );

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  const email = await addEmailCookie.parse(request.headers.get('Cookie'));

  if (!email) {
    return data(
      { error: 'It looks like you timed out. Please exit and try again.' },
      { status: 400 }
    );
  }

  try {
    await addEmail({
      code: result.data.code,
      email,
      studentId: user(session),
    });

    toast(session, {
      message: 'Added email address to your profile.',
    });

    return redirect(Route['/profile/emails'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return data({ error: (e as Error).message }, { status: 500 });
  }
}

export default function AddEmailPage() {
  const { error, errors } = getErrors(useActionData<typeof action>());
  const { email } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/profile/emails']}>
      <Modal.Header>
        <Modal.Title>Add Email Address</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Please input the 6-digit passcode that you received to complete the
        addition of <span style={{ fontWeight: 700 }}>{email}</span> to your
        profile.
      </Modal.Description>

      <Form className="form" method="post">
        <Field error={errors.code} label="Code" labelFor="code" required>
          <Input autoFocus id="code" name="code" required />
        </Field>

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Verify</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
