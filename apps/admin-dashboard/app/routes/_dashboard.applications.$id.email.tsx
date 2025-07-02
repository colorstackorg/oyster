import {
  type ActionFunctionArgs,
  data,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
  useLoaderData,
} from 'react-router';
import { type z } from 'zod';

import {
  getApplication,
  updateEmailApplication,
} from '@oyster/core/applications';
import { Application } from '@oyster/types';
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
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'ambassador',
  });

  const application = await getApplication(params.id as string, [
    'applications.firstName',
    'applications.lastName',
  ]);

  if (!application) {
    throw new Response(null, { status: 404 });
  }

  return {
    application,
  };
}

const UpdateApplicationEmailInput = Application.pick({
  email: true,
});

type UpdateApplicationEmailInput = z.infer<typeof UpdateApplicationEmailInput>;

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    minimumRole: 'ambassador',
  });

  const result = await validateForm(request, UpdateApplicationEmailInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  const updateResult = updateEmailApplication({
    email: result.data.email,
    id: params.id as string,
  });

  if (updateResult instanceof Error) {
    return data({ error: updateResult.message }, { status: 500 });
  }

  toast(session, {
    message: 'Updated application email.',
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
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Form className="form" method="post">
      <Field error={errors.email} label="Email" labelFor={keys.email} required>
        <Input id={keys.email} name={keys.email} required />
      </Field>

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Group>
        <Button.Submit>Update</Button.Submit>
      </Button.Group>
    </Form>
  );
}
