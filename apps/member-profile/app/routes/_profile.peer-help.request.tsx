import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form,
  generatePath,
  useActionData,
  useSearchParams,
} from '@remix-run/react';

import { requestHelp, RequestHelpInput } from '@oyster/core/peer-help';
import {
  Button,
  ErrorMessage,
  Field,
  getErrors,
  Modal,
  Radio,
  Textarea,
  validateForm,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { commitSession, toast, user } from '@/shared/session.server';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    RequestHelpInput.omit({ helpeeId: true })
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  const result = await requestHelp({
    ...data,
    helpeeId: user(session),
  });

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'Request submitted!',
  });

  const url = new URL(request.url);

  url.pathname = generatePath(Route['/peer-help/:id'], {
    id: result.data.id,
  });

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

// Page

export default function RequestHelpModal() {
  const { error, errors } = getErrors(useActionData<typeof action>());
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/peer-help'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Request Help</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        <Field
          description="We currently only support these areas of need."
          error={errors.type}
          label="What type of help do you need?"
          labelFor="type"
          required
        >
          <Radio.Group>
            <Radio
              color="pink-100"
              id="career-advice"
              label="Career Advice"
              name="type"
              required
              value="career_advice"
            />
            <Radio
              color="purple-100"
              id="mock-interview"
              label="Mock Interview"
              name="type"
              required
              value="mock_interview"
            />
            <Radio
              color="blue-100"
              id="resume-review"
              label="Resume Review"
              name="type"
              required
              value="resume_review"
            />
          </Radio.Group>
        </Field>

        <Field
          description="This will help those who are looking to help find the right person."
          error={errors.description}
          label="Please describe what you need help with in more detail."
          labelFor="description"
          required
        >
          <Textarea
            id="description"
            minLength={100}
            name="description"
            required
          />
        </Field>

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Request</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
