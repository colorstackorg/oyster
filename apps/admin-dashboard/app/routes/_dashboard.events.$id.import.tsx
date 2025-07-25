import { type FileUpload, parseFormData } from '@mjackson/form-data-parser';
import {
  type ActionFunctionArgs,
  data,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
  useLoaderData,
} from 'react-router';
import { z } from 'zod';

import { parseCsv } from '@oyster/core/admin-dashboard/server';
import { job } from '@oyster/core/bull';
import { getEvent } from '@oyster/core/events';
import { db } from '@oyster/db';
import { Email, EventAttendee } from '@oyster/types';
import {
  Button,
  ErrorMessage,
  Field,
  FileUploader,
  getErrors,
  Modal,
  validateForm,
} from '@oyster/ui';
import { id } from '@oyster/utils';

import { Route } from '@/shared/constants';
import { findStudentByEmail } from '@/shared/queries/student';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const event = await getEvent(params.id as string, ['events.name']);

  if (!event) {
    throw new Response(null, { status: 404 });
  }

  return {
    event,
  };
}

const ImportEventAttendeesInput = z.object({
  file: z.custom<File>(),
});

type ImportEventAttendeesInput = z.infer<typeof ImportEventAttendeesInput>;

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  async function uploadHandler(fileUpload: FileUpload) {
    if (fileUpload.fieldName === 'file' && fileUpload.type === 'text/csv') {
      return fileUpload;
    }
  }

  const form = await parseFormData(request, uploadHandler);

  const result = await validateForm(form, ImportEventAttendeesInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  let count = 0;

  try {
    const importResult = await importEventAttendees(
      params.id as string,
      result.data
    );

    count = importResult.count;
  } catch (e) {
    return data({ error: (e as Error).message }, { status: 500 });
  }

  toast(session, {
    message: `Imported ${count} event attendees.`,
  });

  return redirect(Route['/events'], {
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
        studentId: true,
      })
        .extend({ id: z.string().trim().min(1) })
        .parse({
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

  return (
    <Modal onCloseTo={Route['/events']}>
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

const keys = ImportEventAttendeesInput.keyof().enum;

function ImportEventAttendeesForm() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Form className="form" method="post" encType="multipart/form-data">
      <Field error={errors.file} labelFor={keys.file} required>
        <FileUploader
          accept={['text/csv']}
          id={keys.file}
          name={keys.file}
          required
        />
      </Field>

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Group>
        <Button.Submit>Import</Button.Submit>
      </Button.Group>
    </Form>
  );
}
