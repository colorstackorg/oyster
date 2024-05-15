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
} from '@remix-run/react';
import { type z } from 'zod';

import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import { addEmail } from '@/member-profile.server';
import { AddEmailInput } from '@/member-profile.ui';
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

  return json({
    email,
  });
}

const AddEmailFormData = AddEmailInput.pick({
  code: true,
});

type AddEmailFormData = z.infer<typeof AddEmailFormData>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    AddEmailFormData,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
  }

  const email = await addEmailCookie.parse(request.headers.get('Cookie'));

  if (!email) {
    return json({
      error: 'It looks like you timed out. Please exit and try again.',
      errors,
    });
  }

  try {
    await addEmail({
      code: data.code,
      email,
      studentId: user(session),
    });

    toast(session, {
      message: 'Added email address to your profile.',
      type: 'success',
    });

    return redirect(Route['/profile/emails'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json({
      error: (e as Error).message,
      errors,
    });
  }
}

const keys = AddEmailFormData.keyof().enum;

export default function AddEmailPage() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());
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

      <RemixForm className="form" method="post">
        <Form.Field
          error={errors.code}
          label="Code"
          labelFor={keys.code}
          required
        >
          <Input autoFocus id={keys.code} name={keys.code} required />
        </Form.Field>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Verify</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
