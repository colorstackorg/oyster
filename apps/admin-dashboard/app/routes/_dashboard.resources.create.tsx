import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigate,
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
import { Resource, ResourceStatus } from '@colorstack/types';
import { id } from '@colorstack/utils';

import { Route } from '../shared/constants';
import { db } from '../shared/core.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);
  return json({});
}

const CreateResourceInput = Resource.pick({
  name: true,
});

type CreateResourceInput = z.infer<typeof CreateResourceInput>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    CreateResourceInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
  }

  await db
    .insertInto('resources')
    .values({
      id: id(),
      name: data.name,
      status: ResourceStatus.ACTIVE,
    })
    .execute();

  toast(session, {
    message: `Created ${data.name}.`,
    type: 'success',
  });

  const url = new URL(request.url);

  const redirectTo = url.searchParams.get('redirect') || Route.STUDENTS;

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function CreateResourcePage() {
  const navigate = useNavigate();

  function onClose() {
    navigate(-1);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Create Resource</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <CreateResourceForm />
    </Modal>
  );
}

const { name } = CreateResourceInput.keyof().enum;

function CreateResourceForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

  return (
    <RemixForm className="form" method="post">
      <Form.Field error={errors.name} label="Name" labelFor={name} required>
        <Input id={name} name={name} required />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button loading={submitting} type="submit">
          Create
        </Button>
      </Button.Group>
    </RemixForm>
  );
}
