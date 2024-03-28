import {
  ActionFunctionArgs,
  unstable_composeUploadHandlers as composeUploadHandlers,
  unstable_createFileUploadHandler as createFileUploadHandler,
  unstable_createMemoryUploadHandler as createMemoryUploadHandler,
  json,
  LoaderFunctionArgs,
  unstable_parseMultipartFormData as parseMultipartFormData,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
} from '@remix-run/react';
import { z } from 'zod';

import { Email, EventAttendee } from '@oyster/types';
import { Button, Form, getActionErrors, Modal, validateForm } from '@oyster/ui';
import { id } from '@oyster/utils';

import { Route } from '../shared/constants';
import { db, getEvent, job, parseCsv } from '../shared/core.server';
import { findStudentByEmail } from '../shared/queries/student';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const event = await getEvent(params.id as string, ['events.name']);

  if (!event) {
    throw new Response(null, { status: 404 });
  }

  return json({
    event,
  });
}

const ImportEventAttendeesInput = z.object({
  file: z.custom<File>(),
});

type ImportEventAttendeesInput = z.infer<typeof ImportEventAttendeesInput>;

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const uploadHandler = composeUploadHandlers(
    createFileUploadHandler(),
    createMemoryUploadHandler()
  );

  const form = await parseMultipartFormData(request, uploadHandler);

  const { data, errors } = validateForm(
    ImportEventAttendeesInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
  }

  let count = 0;

  try {
    const result = await importEventAttendees(params.id as string, data);
    count = result.count;
  } catch (e) {
    return json({
      error: (e as Error).message,
      errors,
    });
  }

  toast(session, {
    message: `Imported ${count} event attendees.`,
    type: 'success',
  });

  return redirect(Route.EVENTS, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const EventAttendeeRecord = z.object({
  Email: Email,
  Name: EventAttendee.shape.name,
});

async function importEventAttendees(
  eventId: string,
  input: ImportEventAttendeesInput
) {
  const csvString = await input.file.text();

  const records = await parseCsv(csvString);

  const attendees = await Promise.all(
    records.map(async (record, i) => {
      const result = EventAttendeeRecord.safeParse(record);

      if (!result.success) {
        throw new Error(
          `There was an error parsing row #${i} (${record.Email}).`
        );
      }

      const { Email: email, Name: name } = result.data;

      const row = await findStudentByEmail(email)
        .select(['studentEmails.studentId'])
        .executeTakeFirst();

      return EventAttendee.pick({
        email: true,
        eventId: true,
        name: true,
        id: true,
        studentId: true,
      }).parse({
        email,
        eventId,
        id: id(),
        name,
        studentId: row?.studentId,
      });
    })
  );

  await db
    .insertInto('eventAttendees')
    .values(attendees)
    .onConflict((oc) => oc.doNothing())
    .execute();

  attendees.forEach((attendee) => {
    if (attendee.studentId) {
      job('event.attended', {
        eventId: attendee.eventId,
        studentId: attendee.studentId,
      });
    }
  });

  return {
    count: attendees.length,
  };
}

export default function ImportEventAttendeesPage() {
  const { event } = useLoaderData<typeof loader>();

  const navigate = useNavigate();

  function onClose() {
    navigate(Route.EVENTS);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Import Event Attendees</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Please upload a .csv file of attendees for "{event.name}".
      </Modal.Description>

      <ImportEventAttendeesForm />
    </Modal>
  );
}

const { file } = ImportEventAttendeesInput.keyof().enum;

function ImportEventAttendeesForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

  return (
    <RemixForm className="form" method="post" encType="multipart/form-data">
      <Form.Field error={errors.file} labelFor={file} required>
        <input accept=".csv" id={file} name={file} required type="file" />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button loading={submitting} type="submit">
          Import
        </Button>
      </Button.Group>
    </RemixForm>
  );
}
