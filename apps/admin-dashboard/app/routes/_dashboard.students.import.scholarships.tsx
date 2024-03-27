import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
  unstable_composeUploadHandlers as composeUploadHandlers,
  unstable_createFileUploadHandler as createFileUploadHandler,
  unstable_createMemoryUploadHandler as createMemoryUploadHandler,
  unstable_parseMultipartFormData as parseMultipartFormData,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigate,
  useNavigation,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { z } from 'zod';

import {
  Button,
  Form,
  getActionErrors,
  Modal,
  validateForm,
} from '@colorstack/core-ui';
import {
  Email,
  ScholarshipRecipient,
  ScholarshipType,
} from '@colorstack/types';
import { id } from '@colorstack/utils';

import { Route } from '../shared/constants';
import { db, parseCsv } from '../shared/core.server';
import { findStudentByEmail } from '../shared/queries/student';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);
  return json({});
}

const ImportScholarshipRecipientsInput = z.object({
  file: z.custom<File>(),
});

type ImportScholarshipRecipientsInput = z.infer<
  typeof ImportScholarshipRecipientsInput
>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const uploadHandler = composeUploadHandlers(
    createFileUploadHandler(),
    createMemoryUploadHandler()
  );

  const form = await parseMultipartFormData(request, uploadHandler);

  const { data, errors } = validateForm(
    ImportScholarshipRecipientsInput,
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
    const result = await importScholarshipRecipients(data);
    count = result.count;
  } catch (e) {
    return json({
      error: (e as Error).message,
      errors,
    });
  }

  toast(session, {
    message: `Imported ${count} scholarship recipients.`,
    type: 'success',
  });

  return redirect(Route.STUDENTS, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const TYPE_FROM_CSV: Record<string, ScholarshipType> = {
  Conference: 'conference',
  Direct: 'direct',
  Tuition: 'tuition',
};

const ScholarshipRecipientRecord = z.object({
  Amount: z.coerce.number(),

  // If the date is valid, then we'll just set to the 12th hour of the day. We
  // chose that arbitrarily so that all timezones would show the same date.
  'Award Date': z
    .string()
    .refine((value) => dayjs(value).isValid())
    .transform((value) => dayjs(value).hour(12).toDate()),

  Email: Email,

  Reason: z.string(),

  // In order for the CSV to be more friendly to our admins, we'll require
  // them to use the title-case version of the scholarship type.
  Type: z.string().transform((value) => TYPE_FROM_CSV[value]),
});

async function importScholarshipRecipients(
  input: ImportScholarshipRecipientsInput
) {
  const csvString = await input.file.text();

  const records = await parseCsv(csvString);

  if (!records.length) {
    throw new Error(
      'There must be at least one row in order to import scholarship recipients.'
    );
  }

  const scholarshipRecipients = await Promise.all(
    records.map(async (record, i) => {
      const result = ScholarshipRecipientRecord.safeParse(record);

      if (!result.success) {
        throw new Error(
          `There was an error parsing row #${i} (${record.Email}).`
        );
      }

      const {
        'Award Date': awardedAt,
        Amount: amount,
        Email: email,
        Reason: reason,
        Type: type,
      } = result.data;

      const student = await findStudentByEmail(email)
        .select(['students.id'])
        .executeTakeFirst();

      if (!student) {
        throw new Error(`Could not find student with the email "${email}".`);
      }

      return ScholarshipRecipient.omit({
        createdAt: true,
        deletedAt: true,
        updatedAt: true,
      }).parse({
        amount,
        awardedAt,
        email,
        id: id(),
        reason,
        studentId: student.id,
        type,
      });
    })
  );

  await db
    .insertInto('scholarshipRecipients')
    .values(scholarshipRecipients)
    .onConflict((oc) => oc.doNothing())
    .execute();

  return {
    count: scholarshipRecipients.length,
  };
}

export default function ImportScholarshipsPage() {
  const navigate = useNavigate();

  function onClose() {
    navigate(Route.STUDENTS);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Import Scholarship Recipients</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <ImportScholarshipsForm />
    </Modal>
  );
}

const { file } = ImportScholarshipRecipientsInput.keyof().enum;

function ImportScholarshipsForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

  return (
    <RemixForm className="form" method="post" encType="multipart/form-data">
      <Form.Field
        description="Please upload a .csv file."
        error={errors.file}
        label="File"
        labelFor={file}
        required
      >
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
