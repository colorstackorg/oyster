import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, generatePath, useActionData, useParams } from '@remix-run/react';
import { z } from 'zod';

import {
  Button,
  ErrorMessage,
  Field,
  getErrors,
  Input,
  Modal,
  Textarea,
  validateForm,
} from '@oyster/ui';

import { validateQueue } from '@/shared/bull';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  return json({});
}

const AddJobInput = z.object({
  data: z
    .string()
    .refine((value) => {
      try {
        JSON.parse(value);

        return true;
      } catch {
        return false;
      }
    }, 'Must be a valid JSON string.')
    .transform((value) => JSON.parse(value))
    .transform((value) => JSON.stringify(value))
    .transform((value) => JSON.parse(value)),

  name: z.string().trim().min(1),
});

type AddJobInput = z.infer<typeof AddJobInput>;

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const result = await validateForm(request, AddJobInput);

  if (!result.ok) {
    return json({ errors: result.errors }, { status: 400 });
  }

  const queue = await validateQueue(params.queue);

  await queue.add(result.data.name, result.data.data);

  toast(session, {
    message: 'Added job.',
  });

  return redirect(generatePath(Route['/bull/:queue'], { queue: queue.name }), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function AddJobPage() {
  const { queue } = useParams();

  return (
    <Modal
      onCloseTo={generatePath(Route['/bull/:queue'], {
        queue: queue as string,
      })}
    >
      <Modal.Header>
        <Modal.Title>Add Job</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <AddJobForm />
    </Modal>
  );
}

const keys = AddJobInput.keyof().enum;

function AddJobForm() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Form className="form" method="post">
      <Field error={errors.name} label="Name" labelFor={keys.name} required>
        <Input id={keys.name} name={keys.name} required />
      </Field>

      <Field error={errors.data} label="Data" labelFor={keys.data} required>
        <Textarea id={keys.data} minRows={4} name={keys.data} required />
      </Field>

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Group>
        <Button.Submit>Add</Button.Submit>
      </Button.Group>
    </Form>
  );
}
