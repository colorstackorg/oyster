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

import { Application } from '@oyster/types';
import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import {
  getApplication,
  updateEmailApplication,
} from '@/admin-dashboard.server';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

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

  url.pathname = Route['/applications'];

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

const keys = UpdateApplicationEmailInput.keyof().enum;

function UpdateApplicationEmailForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        error={errors.email}
        label="Email"
        labelFor={keys.email}
        required
      >
        <Input id={keys.email} name={keys.email} required />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Update</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
