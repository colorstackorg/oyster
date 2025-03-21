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
  DatePicker,
  ErrorMessage,
  Field,
  getErrors,
  Modal,
  Textarea,
  validateForm,
} from '@oyster/ui';
import { Select } from '@oyster/ui';

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
          <Select id="type" name="type" required>
            <option value="career_advice">Career Advice</option>
            <option value="mock_interview">Mock Interview</option>
            <option value="resume_review">Resume Review</option>
          </Select>
        </Field>

        <Field
          description=""
          error={errors.helpBy}
          label="When do you need help by?"
          labelFor="helpBy"
          required
        >
          <DatePicker
            id="helpBy"
            max=""
            min=""
            name="helpBy"
            type="date"
            required
          />
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
