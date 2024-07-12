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
  generatePath,
  Link,
  Form as RemixForm,
  useLoaderData,
} from '@remix-run/react';

import { SubmitResumeInput } from '@oyster/core/resume-books';
import { submitResume } from '@oyster/core/resume-books.server';
import { Button, Form, Input, Text, validateForm } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { getMember } from '@/shared/queries';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const member = await getMember(user(session))
    .select([
      'currentLocation',
      'currentLocationCoordinates',
      'educationLevel',
      'email',
      'firstName',
      'graduationYear',
      'hometown',
      'hometownCoordinates',
      'lastName',
      'race',
    ])
    .executeTakeFirst();

  if (!member) {
    throw new Response(null, { status: 404 });
  }

  return json({
    ...member,
  });
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
    <section className="mx-auto flex w-full max-w-[36rem] flex-col gap-[inherit]">
      <div>
        <Text color="gray-500">
          Please ensure that everything in your profile is up to date before
          submitting your resume. We'll be sending the following information to
          partners:
        </Text>

        <ul className="my-2 list-disc ps-8 text-gray-500">
          <li>
            <Link className="link" to={Route['/profile/general']}>
              First Name
            </Link>
          </li>
          <li>
            <Link className="link" to={Route['/profile/general']}>
              Last Name
            </Link>
          </li>
          <li>
            <Link className="link" to={Route['/profile/emails']}>
              Primary Email
            </Link>
          </li>
          <li>
            <Link className="link" to={Route['/profile/general']}>
              Current Location
            </Link>
          </li>
          <li>
            <Link className="link" to={Route['/profile/personal']}>
              Hometown
            </Link>
          </li>
          <li>
            <Link className="link" to={Route['/profile/socials']}>
              LinkedIn URL
            </Link>
          </li>
        </ul>
      </div>

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
    </section>
  );
}
