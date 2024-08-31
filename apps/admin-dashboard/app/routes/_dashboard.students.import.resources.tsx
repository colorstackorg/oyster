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
import dayjs from 'dayjs';
import { z } from 'zod';

import { parseCsv } from '@oyster/core/admin-dashboard/server';
import { db } from '@oyster/db';
import { Email, Resource, ResourceUser } from '@oyster/types';
import {
  Button,
  FileUploader,
  Form,
  getErrors,
  Modal,
  Select,
  Text,
  type TextProps,
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

const ResourceInView = Resource.pick({
  id: true,
  name: true,
});

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const resources = await listResources();

  return json({
    resources,
  });
}

async function listResources() {
  const rows = await db
    .selectFrom('internalResources')
    .select(['id', 'name'])
    .execute();

  const resources = rows.map((row) => {
    return ResourceInView.parse(row);
  });

  return resources;
}

const ImportResourceUsersInput = z.object({
  file: z.custom<File>(),
  resource: Resource.shape.id,
});

type ImportResourceUsersInput = z.infer<typeof ImportResourceUsersInput>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const uploadHandler = composeUploadHandlers(
    createFileUploadHandler(),
    createMemoryUploadHandler()
  );

  const form = await parseMultipartFormData(request, uploadHandler);

  const { data, errors, ok } = await validateForm(
    form,
    ImportResourceUsersInput
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  let count = 0;

  try {
    const result = await importResourceUsers(data);

    count = result.count;
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }

  toast(session, {
    message: `Imported ${count} resource users.`,
  });

  return redirect(Route['/students'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const ResourceUserRecord = z.object({
  // If the date is valid, then we'll just set to the 12th hour of the day. We
  // chose that arbitrarily so that all timezones would show the same date.
  'Date Used': z
    .string()
    .optional()
    .transform((value) => {
      return value && dayjs(value).isValid()
        ? dayjs(value).hour(12).toDate()
        : undefined;
    }),

  Email: Email,
});

async function importResourceUsers(input: ImportResourceUsersInput) {
  const csvString = await input.file.text();

  const records = await parseCsv(csvString);

  if (!records.length) {
    throw new Error(
      'There must be at least one row in order to import resource users.'
    );
  }

  const resourceUsers = await Promise.all(
    records.map(async (record, i) => {
      const result = ResourceUserRecord.safeParse(record);

      if (!result.success) {
        throw new Error(
          `There was an error parsing row #${i} (${record.Email}).`
        );
      }

      const { 'Date Used': usedAt, Email: email } = result.data;

      const student = await findStudentByEmail(email)
        .select(['students.id'])
        .executeTakeFirst();

      return ResourceUser.pick({
        email: true,
        id: true,
        resourceId: true,
        studentId: true,
        usedAt: true,
      }).parse({
        email,
        id: id(),
        resourceId: input.resource,
        studentId: student?.id,
        usedAt,
      });
    })
  );

  await db
    .insertInto('internalResourceUsers')
    .values(resourceUsers)
    .onConflict((oc) => oc.doNothing())
    .execute();

  return {
    count: resourceUsers.length,
  };
}

export default function ImportResourcesPage() {
  return (
    <Modal onCloseTo={Route['/students']}>
      <Modal.Header>
        <Modal.Title>Import Resource Users</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <ImportResourcesForm />
    </Modal>
  );
}

const keys = ImportResourceUsersInput.keyof().enum;

function ImportResourcesForm() {
  const { error, errors } = getErrors(useActionData<typeof action>());
  const { resources } = useLoaderData<typeof loader>();

  return (
    <RemixForm className="form" method="post" encType="multipart/form-data">
      <Form.Field
        description={<ResourceFieldDescription />}
        error={errors.resource}
        label="Resource"
        labelFor={keys.resource}
        required
      >
        <Select id={keys.resource} name={keys.resource} required>
          {resources.map((resource) => {
            return (
              <option key={resource.id} value={resource.id}>
                {resource.name}
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
        <FileUploader
          accept={['text/csv']}
          id={keys.file}
          name={keys.file}
          required
        />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Import</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}

function ResourceFieldDescription(props: Pick<TextProps, 'className'>) {
  const to = `${Route['/resources/create']}?redirect=${Route['/students/import/resources']}`;

  return (
    <Text {...props}>
      Which resource would you like to import users for? If you can't find the
      resource you are looking for, you can create one{' '}
      <Link className="link" to={to}>
        here
      </Link>
      .
    </Text>
  );
}
