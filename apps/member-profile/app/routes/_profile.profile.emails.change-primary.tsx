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

import {
  Button,
  Form,
  getActionErrors,
  Modal,
  Select,
  validateForm,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { changePrimaryEmail, listEmails } from '@/shared/core.server';
import { ChangePrimaryEmailInput } from '@/shared/core.ui';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const emails = await listEmails(user(session));

  return json({
    emails,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    ChangePrimaryEmailInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
  }

  try {
    await changePrimaryEmail(user(session), data);

    toast(session, {
      message: 'Your primary email address was updated.',
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

const keys = ChangePrimaryEmailInput.keyof().enum;

export default function ChangePrimaryEmailPage() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());
  const { emails } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/profile/emails']}>
      <Modal.Header>
        <Modal.Title>Change Primary Email Address</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Changing your primary email address will update the email address on
        your Slack account, as well as where all future weekly newsletters will
        be sent to.
      </Modal.Description>

      <RemixForm className="form" method="post">
        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Form.Field
          description="If you don't see your email listed here, please add it to your profile first."
          error={errors.email}
          label="Email"
          labelFor={keys.email}
          required
        >
          <Select id={keys.email} name={keys.email} required>
            {emails.map((email) => {
              return (
                <option
                  disabled={!!email.primary}
                  key={email.email}
                  value={email.email!}
                >
                  {email.email}
                </option>
              );
            })}
          </Select>
        </Form.Field>

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
