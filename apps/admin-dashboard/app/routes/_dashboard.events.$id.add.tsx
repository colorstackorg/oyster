import {
  type LoaderFunctionArgs,
  json,
  type ActionFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigate,
} from '@remix-run/react';
import { addLink } from 'app/shared/queries/events';

import { Event } from '@oyster/types';
import {
  Button,
  Modal,
  Input,
  Form,
  getActionErrors,
  validateForm,
} from '@oyster/ui';

import { Route } from '../shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

const CreateEventFormData = Event.pick({
  link: true,
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

  await addLink(params.id as string, data.link as string);

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
      <Modal.Description>Please Add a link for the event</Modal.Description>

      <AddEventLinkForm />
    </Modal>
  );
}

const { link } = CreateEventFormData.keyof().enum;

function AddEventLinkForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <Form.Field error={errors.link} label="Link" labelFor={link} required>
        <Input id={link} name={link} required />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>
      <Button.Group>
        <Button type="submit">Add</Button>
      </Button.Group>
    </RemixForm>
  );
}
