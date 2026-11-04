import {
  type ActionFunctionArgs,
  data,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
} from 'react-router';

import { createResumeBook } from '@oyster/core/resume-books';
import { CreateResumeBookInput } from '@oyster/core/resume-books/types';
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

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, CreateResumeBookInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  const createResult = await createResumeBook(result.data);

  if (!createResult.ok) {
    return data(
      { errors: { name: createResult.error } },
      { status: createResult.code }
    );
  }

  toast(session, {
    message: 'Created resume book.',
    type: 'success',
  });

  return redirect(Route['/resume-books'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function CreateResumeBookModal() {
  const { errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/resume-books']}>
      <Modal.Header>
        <Modal.Title>Create Resume Book</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        <ResumeBookNameField error={errors.name} />
        <ResumeBookStartDateField error={errors.startDate} />
        <ResumeBookEndDateField error={errors.endDate} />
        <ResumeBookSponsorsField error={errors.sponsors} />
        <ResumeBookHiddenField error={errors.hidden} />
        <Button.Group>
          <Button.Submit>Create</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
