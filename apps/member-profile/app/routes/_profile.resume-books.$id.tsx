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
import { generatePath, Form as RemixForm } from '@remix-run/react';

import { SubmitResumeInput } from '@oyster/core/resume-books';
import { submitResume } from '@oyster/core/resume-books.server';
import { Button, Form, validateForm } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const uploadHandler = composeUploadHandlers(
    createFileUploadHandler({ maxPartSize: 1_000_000 * 1 }),
    createMemoryUploadHandler()
  );

  let form: FormData;

  try {
    form = await parseMultipartFormData(request, uploadHandler);
  } catch (e) {
    return json(
      {
        errors: {
          resume: 'Attachment is too big. Must be less than 1 MB in size.',
        } as Record<keyof SubmitResumeInput, string>,
      },
      {
        status: 400,
      }
    );
  }

  const resumeBookId = params.id as string;

  form.set('memberId', user(session));
  form.set('resumeBookId', resumeBookId);

  const { data, errors, ok } = await validateForm(form, SubmitResumeInput);

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await submitResume({
    memberId: data.memberId,
    resume: data.resume,
    resumeBookId: data.resumeBookId,
  });

  toast(session, {
    message: 'Resume submitted!',
    type: 'success',
  });

  return redirect(
    generatePath(Route['/resume-books/:id'], { id: resumeBookId }),
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

export default function ResumeBook() {
  return (
    <RemixForm className="form" method="post" encType="multipart/form-data">
      <Form.Field
        description="Must be a PDF less than 1 MB."
        error=""
        label="Resume"
        labelFor="resume"
        required
      >
        <input accept=".pdf" id="resume" name="resume" required type="file" />
      </Form.Field>

      <Form.ErrorMessage></Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Submit</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
