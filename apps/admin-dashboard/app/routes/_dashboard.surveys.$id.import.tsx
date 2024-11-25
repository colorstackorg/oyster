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
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';
import { z } from 'zod';

import { importSurveyResponses } from '@oyster/core/admin-dashboard/server';
import { db } from '@oyster/db';
import {
  Button,
  FileUploader,
  Form,
  getErrors,
  Modal,
  validateForm,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const survey = await db
    .selectFrom('surveys')
    .select(['title'])
    .where('id', '=', params.id as string)
    .executeTakeFirst();

  if (!survey) {
    throw new Response(null, { status: 404 });
  }

  return json({
    survey,
  });
}

const ImportSurveyResponsesInput = z.object({
  file: z.custom<File>(),
});

type ImportSurveyResponsesInput = z.infer<typeof ImportSurveyResponsesInput>;

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const uploadHandler = composeUploadHandlers(
    createFileUploadHandler(),
    createMemoryUploadHandler()
  );

  const form = await parseMultipartFormData(request, uploadHandler);

  const { data, errors, ok } = await validateForm(
    form,
    ImportSurveyResponsesInput
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  let count = 0;

  try {
    const csvString = await data.file.text();
    const result = await importSurveyResponses(params.id as string, csvString);

    count = result.count;
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }

  toast(session, {
    message: `Imported ${count} survey responses.`,
  });

  return redirect(Route['/surveys'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function ImportSurveyResponsesPage() {
  const { survey } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/surveys']}>
      <Modal.Header>
        <Modal.Title>Import Survey Responses</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Please upload a .csv file of survey responses for "{survey.title}".
      </Modal.Description>

      <ImportSurveyResponsesForm />
    </Modal>
  );
}

const keys = ImportSurveyResponsesInput.keyof().enum;

function ImportSurveyResponsesForm() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post" encType="multipart/form-data">
      <Form.Field error={errors.file} labelFor={keys.file} required>
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
