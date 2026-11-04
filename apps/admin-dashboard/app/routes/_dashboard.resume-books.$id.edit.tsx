import dayjs from 'dayjs';
import {
  type ActionFunctionArgs,
  data,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
  useLoaderData,
} from 'react-router';

import {
  getResumeBook,
  listResumeBookSponsors,
  updateResumeBook,
} from '@oyster/core/resume-books';
import {
  RESUME_BOOK_TIMEZONE,
  UpdateResumeBookInput,
} from '@oyster/core/resume-books/types';
import {
  ResumeBookEndDateField,
  ResumeBookHiddenField,
  ResumeBookNameField,
  ResumeBookSponsorsField,
  ResumeBookStartDateField,
} from '@oyster/core/resume-books/ui';
import { Button, getErrors, Modal, validateForm } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const resumeBookId = params.id as string;

  const [resumeBook, sponsors] = await Promise.all([
    getResumeBook({
      select: ['endDate', 'hidden', 'name', 'startDate'],
      where: { id: resumeBookId },
    }),

    listResumeBookSponsors({
      where: { resumeBookId },
    }),
  ]);

  if (!resumeBook) {
    throw new Response(null, { status: 404 });
  }

  const format = 'YYYY-MM-DD';
  const tz = RESUME_BOOK_TIMEZONE;

  return {
    endDate: dayjs(resumeBook.endDate).tz(tz).format(format),
    hidden: resumeBook.hidden,
    name: resumeBook.name,
    sponsors: sponsors.map((sponsor) => {
      return {
        id: sponsor.id,
        name: sponsor.name,
      };
    }),
    startDate: dayjs(resumeBook.startDate).tz(tz).format(format),
  };
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(
    request,
    UpdateResumeBookInput.omit({ id: true })
  );

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  const updateResult = await updateResumeBook({
    ...result.data,
    id: params.id as string,
  });

  if (!updateResult.ok) {
    return data({ error: updateResult.error }, { status: updateResult.code });
  }

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
  const { endDate, hidden, name, sponsors, startDate } =
    useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/resume-books']}>
      <Modal.Header>
        <Modal.Title>Edit Resume Book</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        <ResumeBookNameField defaultValue={name} error={errors.name} />
        <ResumeBookStartDateField
          defaultValue={startDate}
          error={errors.startDate}
        />
        <ResumeBookEndDateField defaultValue={endDate} error={errors.endDate} />
        <ResumeBookSponsorsField
          defaultSponsors={sponsors}
          error={errors.sponsors || error}
        />
        <ResumeBookHiddenField defaultValue={hidden} error={errors.hidden} />
        <Button.Group>
          <Button.Submit>Edit</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
