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
  useNavigate,
  useNavigation,
} from '@remix-run/react';
import { sql } from 'kysely';

import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  Select,
  Textarea,
  validateForm,
} from '@colorstack/core-ui';

import { Route } from '../shared/constants';
import { createSurvey, listEvents } from '../shared/core.server';
import { CreateSurveyInput } from '../shared/core.ui';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const { events } = await listEvents({ limit: 25 }, [
    'events.id',
    'events.name',
    sql<string>`to_char(events.start_time, 'YYYY-MM-DD')`.as('date'),
  ]);

  return json({
    events,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    CreateSurveyInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Please fix the errors above.',
      errors,
    });
  }

  await createSurvey({
    description: data.description,
    eventId: data.eventId,
    title: data.title,
  });

  toast(session, {
    message: `Created survey.`,
    type: 'success',
  });

  return redirect(Route.SURVEYS, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function CreateSurveyPage() {
  const navigate = useNavigate();

  function onClose() {
    navigate(-1);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Create Survey</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <CreateSurveyForm />
    </Modal>
  );
}

const keys = CreateSurveyInput.keyof().enum;

function CreateSurveyForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());
  const { events } = useLoaderData<typeof loader>();

  const submitting = useNavigation().state === 'submitting';

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        error={errors.title}
        label="Title"
        labelFor={keys.title}
        required
      >
        <Input id={keys.title} name={keys.title} required />
      </Form.Field>

      <Form.Field
        error={errors.description}
        label="Description"
        labelFor={keys.description}
      >
        <Textarea id={keys.description} minRows={2} name={keys.description} />
      </Form.Field>

      <Form.Field
        description="If this is a feedback survey for a particular event, please choose the event that it should be linked to."
        label="Event"
        labelFor={keys.description}
      >
        <Select id={keys.eventId} name={keys.eventId}>
          {events.map((event) => {
            return (
              <option key={event.id} value={event.id}>
                [{event.date}] {event.name}
              </option>
            );
          })}
        </Select>
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
