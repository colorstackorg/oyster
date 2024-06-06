import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Link,
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';

import { AddCompanyReviewInput } from '@oyster/core/employment';
import {
  Button,
  Divider,
  Form,
  getErrors,
  Modal,
  Radio,
  Select,
  Text,
  Textarea,
  validateForm,
} from '@oyster/ui';
import { Slider } from '@oyster/ui/slider';

import { listWorkExperiences } from '@/member-profile.server';
import { addCompanyReview } from '@/modules/employment/index.server';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const _experiences = await listWorkExperiences(user(session));

  const experiences = _experiences.map(({ companyName, id, title }) => {
    return {
      company: companyName,
      id,
      title,
    };
  });

  return json({
    experiences,
  });
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
  const { experiences } = useLoaderData<typeof loader>();

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        description={
          <Text>
            If you can't find the work experience you're looking for, you'll
            need to add it to your{' '}
            <Link className="link" to={Route['/profile/work']}>
              work history
            </Link>{' '}
            first.
          </Text>
        }
        error={errors.workExperienceId}
        label="Choose a work experience to review."
        labelFor={keys.workExperienceId}
        required
      >
        <Select
          id={keys.workExperienceId}
          name={keys.workExperienceId}
          required
        >
          {experiences.map((experience) => {
            return (
              <option key={experience.id} value={experience.id}>
                {experience.title}, {experience.company}
              </option>
            );
          })}
        </Select>
      </Form.Field>

      <Form.Field
        description={
          <div>
            Should be at least 1,000 characters. Feel free to use these guiding
            questions:
            <ul className="mt-2 list-disc ps-8">
              <li>What was the company culture like?</li>
              <li>Did you feel supported as an employee?</li>
              <li>What did you work on?</li>
              <li>Were you able to develop any new skills?</li>
            </ul>
          </div>
        }
        error={errors.text}
        label="Write a review about your experience with this company."
        labelFor={keys.text}
        required
      >
        <Textarea
          id={keys.text}
          minLength={1000}
          minRows={10}
          name={keys.text}
          required
        />
      </Form.Field>

      <Divider />

      <Form.Field
        error={errors.rating}
        label="On a scale from 1-10, how would you rate this experience?"
        labelFor={keys.rating}
        required
      >
        <Slider
          aria-required="true"
          id={keys.rating}
          min={1}
          max={10}
          name={keys.rating}
          step={1}
        />
      </Form.Field>

      <Form.Field
        error={errors.recommend}
        label="Would you recommend this company to another ColorStack member?"
        labelFor={keys.recommend}
        required
      >
        <Radio.Group>
          <Radio
            color="lime-100"
            id={keys.recommend + '1'}
            label="Yes"
            name={keys.recommend}
            required
            value="1"
          />
          <Radio
            color="red-100"
            id={keys.recommend + '1'}
            label="No"
            name={keys.recommend}
            required
            value="0"
          />
        </Radio.Group>
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Save</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
