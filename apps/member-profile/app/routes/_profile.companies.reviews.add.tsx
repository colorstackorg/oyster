import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { useActionData, useSearchParams } from '@remix-run/react';

import { AddCompanyReviewInput } from '@oyster/core/employment';
import { addCompanyReview } from '@oyster/core/employment.server';
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

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  form.set('studentId', user(session));

  const { data, errors, ok } = await validateForm(form, AddCompanyReviewInput);

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await addCompanyReview({
    rating: data.rating,
    recommend: data.recommend,
    studentId: data.studentId,
    text: data.text,
    workExperienceId: data.workExperienceId,
    anonymous: data.anonymous,
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

export default function AddReviewModal() {
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
        <Modal.Title>Add Company Review</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <AddReviewForm error={error} errors={errors} showExperienceField />
    </Modal>
  );
}
