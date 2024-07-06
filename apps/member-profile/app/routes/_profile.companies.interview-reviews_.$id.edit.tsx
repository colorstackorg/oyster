import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { useActionData, useLoaderData } from '@remix-run/react';

import { EditInterviewReviewInput } from '@oyster/core/employment';
import {
  editInterviewReview,
  getInterviewReview,
} from '@oyster/core/employment.server';
import { getErrors, Modal, validateForm } from '@oyster/ui';

import { EditInterviewReviewForm } from '@/shared/components/interview-review-form';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const review = await getInterviewReview({
    where: { interviewReviewId: params.id as string },
  });

  if (!review) {
    throw new Response(null, { status: 404 });
  }

  return json({
    review,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  form.set('interviewReviewId', params.id as string);

  const { data, errors, ok } = await validateForm(
    form,
    EditInterviewReviewInput
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await editInterviewReview({
    interviewPosition: data.interviewPosition,
    text: data.text,
    interviewReviewId: params.interviewReviewId as string,
    companyId: '0n08gflgpkqz', // TODO: fix company id submission
  });

  toast(session, {
    message: 'Your review has been updated!',
  });

  return redirect(Route['/profile/work'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function EditReviewModal() {
  const { error, errors } = getErrors(useActionData<typeof action>());
  const { review } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/companies']}>
      <Modal.Header>
        <Modal.Title>Edit Interview Review</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <EditInterviewReviewForm error={error} errors={errors} review={review} />
    </Modal>
  );
}
