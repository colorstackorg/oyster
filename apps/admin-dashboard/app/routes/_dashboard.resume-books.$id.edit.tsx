import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';
import dayjs from 'dayjs';

import { getResumeBook, updateResumeBook } from '@oyster/core/resumes';
import {
  RESUME_BOOK_TIMEZONE,
  UpdateResumeBookInput,
} from '@oyster/core/resumes/types';
import {
  ResumeBookEndDateField,
  ResumeBookHiddenField,
  ResumeBookNameField,
  ResumeBookStartDateField,
} from '@oyster/core/resumes/ui';
import { Button, getErrors, Modal, validateForm } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const resumeBook = await getResumeBook({
    select: ['endDate', 'hidden', 'name', 'startDate'],
    where: { id: params.id as string },
  });

  if (!resumeBook) {
    throw new Response(null, { status: 404 });
  }

  // We need to format the dates so that they respect the <input type="date" />
  // format.
  const format = 'YYYY-MM-DD';
  const tz = RESUME_BOOK_TIMEZONE;

  return json({
    endDate: dayjs(resumeBook.endDate).tz(tz).format(format),
    hidden: resumeBook.hidden,
    name: resumeBook.name,
    startDate: dayjs(resumeBook.startDate).tz(tz).format(format),
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    UpdateResumeBookInput.omit({ id: true })
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await updateResumeBook({
    endDate: data.endDate,
    hidden: data.hidden,
    id: params.id as string,
    name: data.name,
    startDate: data.startDate,
  });

  toast(session, {
    message: 'Updated resume book.',
    type: 'success',
  });

  return redirect(Route['/resume-books'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function EditResumeBookModal() {
  const { endDate, hidden, name, startDate } = useLoaderData<typeof loader>();
  const { errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/resume-books']}>
      <Modal.Header>
        <Modal.Title>Edit Resume Book</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <ResumeBookNameField defaultValue={name} error={errors.name} />
        <ResumeBookStartDateField
          defaultValue={startDate}
          error={errors.startDate}
        />
        <ResumeBookEndDateField defaultValue={endDate} error={errors.endDate} />
        <ResumeBookHiddenField defaultValue={hidden} error={errors.hidden} />
        <Button.Group>
          <Button.Submit>Edit</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
