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
import { Form as RemixForm, useActionData } from '@remix-run/react';

import {
  ImportRecipientsInput,
  importScholarshipRecipients,
} from '@oyster/core/scholarships';
import { ScholarshipFileField } from '@oyster/core/scholarships/ui';
import { Button, Form, getErrors, Modal, validateForm } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const uploadHandler = composeUploadHandlers(
    createFileUploadHandler(),
    createMemoryUploadHandler()
  );

  const form = await parseMultipartFormData(request, uploadHandler);

  const { data, errors, ok } = await validateForm(form, ImportRecipientsInput);

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  let count = 0;

  try {
    const result = await importScholarshipRecipients(data);

    count = result.count;
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }

  toast(session, {
    message: `Imported ${count} scholarship recipients.`,
  });

  return redirect(Route['/students'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function ImportScholarshipsPage() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/students']}>
      <Modal.Header>
        <Modal.Title>Import Scholarship Recipients</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post" encType="multipart/form-data">
        <ScholarshipFileField error={errors.file} />
        <Form.ErrorMessage>{error}</Form.ErrorMessage>
        <Button.Group>
          <Button.Submit>Import</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
