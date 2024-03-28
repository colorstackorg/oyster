import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  generatePath,
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
  Textarea,
  validateForm,
} from '@oyster/ui';

import { Route } from '../shared/constants';
import { QueueFromName } from '../shared/core.server';
import { BullQueue } from '../shared/core.ui';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

const BullParams = z.object({
  queue: z.nativeEnum(BullQueue),
});

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);
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

const AddJobKey = AddJobInput.keyof().enum;

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();
  const values = Object.fromEntries(form);

  const { data, errors } = validateForm(AddJobInput, values);

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  const { queue: queueName } = BullParams.parse(params);

  const queue = QueueFromName[queueName];

  await queue.add(data.name, data.data);

  toast(session, {
    message: 'Added job.',
    type: 'success',
  });

  return redirect(
    generatePath(Route['/bull/:queue/jobs'], { queue: queueName }),
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

export default function AddJobPage() {
  const navigate = useNavigate();

  function onClose() {
    navigate(-1);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Add Job</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <AddJobForm />
    </Modal>
  );
}

function AddJobForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        error={errors.name}
        label="Name"
        labelFor={AddJobKey.name}
        required
      >
        <Input id={AddJobKey.name} name={AddJobKey.name} required />
      </Form.Field>

      <Form.Field
        error={errors.data}
        label="Data"
        labelFor={AddJobKey.data}
        required
      >
        <Textarea
          id={AddJobKey.data}
          minRows={4}
          name={AddJobKey.data}
          required
        />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button loading={submitting} type="submit">
          Add
        </Button>
      </Button.Group>
    </RemixForm>
  );
}
