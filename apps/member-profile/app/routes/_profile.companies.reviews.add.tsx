import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useSearchParams,
} from '@remix-run/react';

import { AddCompanyReviewInput } from '@oyster/core/employment';
import {
  Button,
  Divider,
  Form,
  getErrors,
  Modal,
  validateForm,
} from '@oyster/ui';

import { addCompanyReview } from '@/modules/employment/index.server';
import {
  ReviewExperienceField,
  ReviewRatingField,
  ReviewRecommendField,
  ReviewTextField,
} from '@/shared/components/review-form';
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

const keys = AddCompanyReviewInput.keyof().enum;

export default function AddReviewModal() {
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

      <AddReviewForm />
    </Modal>
  );
}

function AddReviewForm() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <ReviewExperienceField
        error={errors.workExperienceId}
        name={keys.workExperienceId}
      />
      <ReviewTextField error={errors.text} name={keys.text} />
      <Divider />
      <ReviewRatingField error={errors.rating} name={keys.rating} />
      <ReviewRecommendField error={errors.recommend} name={keys.recommend} />

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Save</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
