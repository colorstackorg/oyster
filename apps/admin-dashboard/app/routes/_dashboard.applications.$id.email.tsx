import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useNavigation,
} from '@remix-run/react';
import { z } from 'zod';

import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@colorstack/core-ui';
import { Application } from '@colorstack/types';

import { Route } from '../shared/constants';
import { getApplication, updateEmailApplication } from '../shared/core.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    allowAmbassador: true,
  });

  const application = await getApplication(params.id as string, [
    'applications.firstName',
    'applications.lastName',
  ]);

  if (!application) {
    throw new Response(null, { status: 404 });
  }

  return json({
    application,
  });
}

const UpdateApplicationEmailInput = Application.pick({
  email: true,
});

type UpdateApplicationEmailInput = z.infer<typeof UpdateApplicationEmailInput>;

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    allowAmbassador: true,
  });

  const form = await request.formData();

  const { data, errors } = validateForm(
    UpdateApplicationEmailInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Please fix the errors above.',
      errors,
    });
  }

  const result = updateEmailApplication({
    email: data.email,
    id: params.id as string,
  });

  if (result instanceof Error) {
    return json({
      error: result.message,
      errors,
    });
  }

  toast(session, {
    message: 'Updated application email.',
    type: 'success',
  });

  const url = new URL(request.url);

  url.pathname = Route.APPLICATIONS;

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function UpdateApplicationEmailPage() {
  const { application } = useLoaderData<typeof loader>();

  return (
    <>
      <Modal.Header>
        <Modal.Title>Update Application Email</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Are you sure you want to update the email for {application.firstName}{' '}
        {application.lastName}? They will receive any email communications here
        upon review of their application.
      </Modal.Description>

      <UpdateApplicationEmailForm />
    </>
  );
}

const { email } = UpdateApplicationEmailInput.keyof().enum;

function UpdateApplicationEmailForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

  return (
    <RemixForm className="form" method="post">
      <Form.Field error={errors.email} label="Email" labelFor={email} required>
        <Input id={email} name={email} required />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button loading={submitting} type="submit">
          Update
        </Button>
      </Button.Group>
    </RemixForm>
  );
}
