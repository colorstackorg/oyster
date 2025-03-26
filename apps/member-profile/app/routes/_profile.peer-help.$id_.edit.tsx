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
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';

import { editHelpRequest, EditHelpRequestInput } from '@oyster/core/peer-help';
import { db } from '@oyster/db';
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
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const helpRequest = await db
    .selectFrom('helpRequests')
    .select([
      'helpRequests.description',
      'helpRequests.helpeeId',
      'helpRequests.helperId',
      'helpRequests.id',
      'helpRequests.status',
      'helpRequests.summary',
      'helpRequests.type',
    ])
    .where('id', '=', params.id as string)
    .executeTakeFirstOrThrow();

  if (!helpRequest) {
    throw new Response(null, {
      status: 404,
      statusText: 'The help request you are looking for does not exist.',
    });
  }

  return json(helpRequest);
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    EditHelpRequestInput
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  const result = await editHelpRequest(params.id as string, data);

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'Help request updated!',
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

export default function EditHelpRequestModal() {
  const { description, type } = useLoaderData<typeof loader>();
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
          <Radio.Group defaultValue={type}>
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
            defaultValue={description}
            id="description"
            minLength={100}
            name="description"
            required
          />
        </Field>

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Edit</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
