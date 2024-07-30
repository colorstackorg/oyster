import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { useActionData, useSearchParams } from '@remix-run/react';

import { AddInterviewReviewInput } from '@oyster/core/employment';
import { addInterviewReview } from '@oyster/core/employment.server';
import { getErrors, Modal, validateForm } from '@oyster/ui';

import { AddInterviewReviewForm } from '@/shared/components/interview-review-form';
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

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  form.set('studentId', user(session));

  const { data, errors, ok } = await validateForm(
    form,
    AddInterviewReviewInput
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await addInterviewReview({
    companyCrunchbaseId: data.companyCrunchbaseId,
    interviewPosition: data.interviewPosition,
    text: data.text,
    studentId: data.studentId,
  });

  toast(session, {
    message: 'Your review has been added! 🎉',
  });

  return redirect(Route['/companies'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function AddInterviewReviewModal() {
  const { error, errors } = getErrors(useActionData<typeof action>());
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/companies'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Add Interview Review</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <AddInterviewReviewForm error={error} errors={errors} />
    </Modal>
  );
}
