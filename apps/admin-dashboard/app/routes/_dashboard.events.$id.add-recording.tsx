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
  useNavigate,
} from '@remix-run/react';

import { Event } from '@oyster/types';
import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import { addLink, getEvent } from '@/admin-dashboard.server';
import { Route } from '../shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const event = await getEvent(params.id as string, ['events.recordingLink']);

  if (!event) {
    throw new Response(null, { status: 404 });
  }

  return json({
    event,
  });
}

const CreateEventFormData = Event.pick({
  recordingLink: true,
});

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    CreateEventFormData,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again to upload event link.',
      errors,
    });
  }

  await addLink(params.id as string, data.recordingLink as string);

  toast(session, {
    message: `Link uploaded successfully.`,
    type: 'success',
  });

  return redirect(Route.EVENTS, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function AddEventLink() {
  const { event } = useLoaderData<typeof loader>();
  const defaultValue = event.recordingLink || null;
  const navigate = useNavigate();

  function onClose() {
    navigate(Route.EVENTS);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Add Event URL</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>
      <Modal.Description>
        Please add a recording link for the event
      </Modal.Description>
      <p>{defaultValue ? `Default Value: ${defaultValue}` : ''}</p>

      <AddEventLinkForm />
    </Modal>
  );
}

const { recordingLink } = CreateEventFormData.keyof().enum;

function AddEventLinkForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        error={errors.recordingLink}
        label="Recording Link"
        labelFor={recordingLink}
        required
      >
        <Input id={recordingLink} name={recordingLink} required />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>
      <Button.Group>
        <Button type="submit">Add</Button>
      </Button.Group>
    </RemixForm>
  );
}
