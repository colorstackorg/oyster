import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { useActionData, useLoaderData } from '@remix-run/react';

import { EditCompanyReviewInput } from '@oyster/core/employment';
import {
  editCompanyReview,
  getCompanyReview,
} from '@oyster/core/employment/server';
import { getErrors, Modal, validateForm } from '@oyster/ui';

import { EditReviewForm } from '@/shared/components/review-form';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const review = await getCompanyReview({
    where: { workExperienceId: params.id as string },
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

  form.set('workExperienceId', params.id as string);

  const { data, errors, ok } = await validateForm(form, EditCompanyReviewInput);

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await editCompanyReview({
    anonymous: data.anonymous,
    rating: data.rating,
    recommend: data.recommend,
    text: data.text,
    workExperienceId: data.workExperienceId,
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
    <Modal onCloseTo={Route['/profile/work']}>
      <Modal.Header>
        <Modal.Title>Edit Company Review</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <EditReviewForm error={error} errors={errors} review={review} />
    </Modal>
  );
}
