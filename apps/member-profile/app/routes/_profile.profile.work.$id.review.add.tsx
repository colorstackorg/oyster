import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { useActionData } from '@remix-run/react';

import { AddCompanyReviewInput } from '@oyster/core/employment';
import { addCompanyReview } from '@oyster/core/employment/server';
import { getErrors, Modal, validateForm } from '@oyster/ui';

import { AddReviewForm } from '@/shared/components/review-form';
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

  const form = await request.formData();

  form.set('studentId', user(session));
  form.set('workExperienceId', params.id as string);

  const result = await validateForm(form, AddCompanyReviewInput);

  if (!result.ok) {
    return json({ errors: result.errors }, { status: 400 });
  }

  await addCompanyReview(result.data);

  toast(session, {
    message: 'Your review has been added! 🎉',
  });

  return redirect(Route['/profile/work'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function AddReviewModal() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/profile/work']}>
      <Modal.Header>
        <Modal.Title>Add Company Review</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <AddReviewForm error={error} errors={errors} />
    </Modal>
  );
}
