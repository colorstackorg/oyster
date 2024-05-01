import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigate,
  useNavigation,
} from '@remix-run/react';
import { type z } from 'zod';

import { Program } from '@oyster/types';
import {
  Button,
  DatePicker,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';
import { id } from '@oyster/utils';

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

const CreateProgramInput = Program.pick({
  endDate: true,
  name: true,
  startDate: true,
});

type CreateProgramInput = z.infer<typeof CreateProgramInput>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    CreateProgramInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
  }

  await db
    .insertInto('programs')
    .values({
      endDate: data.endDate,
      id: id(),
      name: data.name,
      startDate: data.startDate,
    })
    .execute();

  toast(session, {
    message: `Created ${data.name}.`,
    type: 'success',
  });

  const url = new URL(request.url);

  const redirectTo = url.searchParams.get('redirect') || Route['/students'];

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function CreateProgramPage() {
  const navigate = useNavigate();

  function onClose() {
    navigate(-1);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Create Program</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <CreateProgramForm />
    </Modal>
  );
}

const { endDate, name, startDate } = CreateProgramInput.keyof().enum;

function CreateProgramForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

  return (
    <RemixForm className="form" method="post">
      <Form.Field error={errors.name} label="Name" labelFor={name} required>
        <Input id={name} name={name} required />
      </Form.Field>

      <Form.Field
        error={errors.startDate}
        label="Start Date"
        labelFor={startDate}
        required
      >
        <DatePicker id={startDate} name={startDate} type="date" required />
      </Form.Field>

      <Form.Field
        error={errors.endDate}
        label="End Date"
        labelFor={endDate}
        required
      >
        <DatePicker id={endDate} name={endDate} type="date" required />
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
