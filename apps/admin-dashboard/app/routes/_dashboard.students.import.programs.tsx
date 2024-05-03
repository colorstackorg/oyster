import {
  type ActionFunctionArgs,
  unstable_composeUploadHandlers as composeUploadHandlers,
  unstable_createFileUploadHandler as createFileUploadHandler,
  unstable_createMemoryUploadHandler as createMemoryUploadHandler,
  json,
  type LoaderFunctionArgs,
  unstable_parseMultipartFormData as parseMultipartFormData,
  redirect,
} from '@remix-run/node';
import {
  Link,
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';
import { z } from 'zod';

import { db } from '@oyster/db';
import { Email, Program, ProgramParticipant } from '@oyster/types';
import {
  Button,
  Form,
  getErrors,
  Modal,
  Select,
  Text,
  type TextProps,
  validateForm,
} from '@oyster/ui';
import { id } from '@oyster/utils';

import { parseCsv } from '@/admin-dashboard.server';
import { Route } from '@/shared/constants';
import { findStudentByEmail } from '@/shared/queries/student';
import {
  commitSession,
  ensureUserAuthenticated,
  getSession,
  toast,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const programs = await listPrograms();

  return json({
    programs,
  });
}

async function listPrograms() {
  const rows = await db.selectFrom('programs').select(['id', 'name']).execute();

  return rows;
}

const ImportProgramParticipantsInput = z.object({
  file: z.custom<File>(),
  program: Program.shape.id,
});

type ImportProgramParticipantsInput = z.infer<
  typeof ImportProgramParticipantsInput
>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const uploadHandler = composeUploadHandlers(
    createFileUploadHandler(),
    createMemoryUploadHandler()
  );

  const form = await parseMultipartFormData(request, uploadHandler);

  const { data, errors, ok } = await validateForm(
    form,
    ImportProgramParticipantsInput
  );

  if (!ok) {
    return json({ errors });
  }

  let count = 0;

  try {
    const result = await importProgramParticipants(data);

    count = result.count;
  } catch (e) {
    return json({
      error: (e as Error).message,
    });
  }

  await getSession(request);

  toast(session, {
    message: `Imported ${count} program participants.`,
  });

  return redirect(Route['/students'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const ProgramParticipantRecord = z.object({
  Email: Email,
});

async function importProgramParticipants(
  input: ImportProgramParticipantsInput
) {
  const csvString = await input.file.text();

  const records = await parseCsv(csvString);

  if (!records.length) {
    throw new Error(
      'There must be at least one row in order to import program participants.'
    );
  }

  const programParticipants = await Promise.all(
    records.map(async (record, i) => {
      const result = ProgramParticipantRecord.safeParse(record);

      if (!result.success) {
        throw new Error(
          `There was an error parsing row #${i} (${record.Email}).`
        );
      }

      const { Email: email } = result.data;

      const row = await findStudentByEmail(email)
        .select(['studentEmails.studentId'])
        .executeTakeFirst();

      return ProgramParticipant.pick({
        email: true,
        id: true,
        programId: true,
        studentId: true,
      }).parse({
        email,
        id: id(),
        programId: input.program,
        studentId: row?.studentId,
      });
    })
  );

  await db
    .insertInto('programParticipants')
    .values(programParticipants)
    .onConflict((oc) => oc.doNothing())
    .execute();

  return {
    count: programParticipants.length,
  };
}

export default function ImportProgramsPage() {
  return (
    <Modal onCloseTo={Route['/students']}>
      <Modal.Header>
        <Modal.Title>Import Program Participants</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <ImportProgramsForm />
    </Modal>
  );
}

const keys = ImportProgramParticipantsInput.keyof().enum;

function ImportProgramsForm() {
  const { error, errors } = getErrors(useActionData<typeof action>());
  const { programs } = useLoaderData<typeof loader>();

  return (
    <RemixForm className="form" method="post" encType="multipart/form-data">
      <Form.Field
        description={<ProgramFieldDescription />}
        error={errors.program}
        label="Program"
        labelFor={keys.program}
        required
      >
        <Select id={keys.program} name={keys.program} required>
          {programs.map((program) => {
            return (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            );
          })}
        </Select>
      </Form.Field>

      <Form.Field
        description="Please upload a .csv file."
        error={errors.file}
        label="File"
        labelFor={keys.file}
        required
      >
        <input
          accept=".csv"
          id={keys.file}
          name={keys.file}
          required
          type="file"
        />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Import</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}

function ProgramFieldDescription(props: Pick<TextProps, 'className'>) {
  const to = `${Route['/programs/create']}?redirect=${Route['/students/import/programs']}`;

  return (
    <Text {...props}>
      Which program would you like to import participants for? If you can't find
      the program you are looking for, you can create one{' '}
      <Link className="link" to={to}>
        here
      </Link>
      .
    </Text>
  );
}
