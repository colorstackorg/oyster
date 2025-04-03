import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form,
  useActionData,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';

import {
  finishHelpRequest,
  FinishHelpRequestInput,
} from '@oyster/core/peer-help';
import { db } from '@oyster/db';
import {
  Button,
  ErrorMessage,
  Field,
  getErrors,
  Modal,
  Radio,
  Text,
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
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);

  const helpRequest = await db
    .selectFrom('helpRequests')
    .select([
      'helpRequests.description',
      'helpRequests.helpeeId',
      'helpRequests.helperId',
      'helpRequests.id',
    ])
    .where('helpRequests.id', '=', params.id as string)
    .executeTakeFirstOrThrow();

  if (!helpRequest) {
    throw new Response(null, {
      status: 404,
      statusText: 'The help request you are looking for does not exist.',
    });
  }

  if (helpRequest.helpeeId !== memberId && helpRequest.helperId !== memberId) {
    throw new Response(null, {
      status: 404,
      statusText: 'You cannot finish this help request.',
    });
  }

  return json(helpRequest);
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);
  const memberId = user(session);

  const { data, errors } = await validateForm(
    request,
    FinishHelpRequestInput.omit({ memberId: true })
  );

  if (!data) {
    return json({ errors }, { status: 400 });
  }

  const { feedback, status } = data;

  const result = await finishHelpRequest(params.id as string, {
    feedback,
    memberId,
    status,
  });

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'Thank you for checking in!',
  });

  const url = new URL(request.url);

  url.pathname = Route['/peer-help'];

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function FinishHelpRequestModal() {
  const { description } = useLoaderData<typeof loader>();
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
        <Modal.Title>Finish Help Request</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Text
        className="border-l border-gray-300 pl-2"
        color="gray-500"
        variant="sm"
      >
        {description}
      </Text>

      <Form method="post" className="form">
        <Field
          description="If you were able to give/receive help asynchronously, that counts too!"
          error={errors.status}
          label="Were you able to give/receive help?"
          labelFor="status"
          required
        >
          <Radio.Group>
            <Radio
              color="lime-100"
              id="met"
              label="Yes, we met up."
              name="status"
              required
              value="met"
            />
            <Radio
              color="red-100"
              id="havent-met"
              label="No, we're not going to meet up."
              name="status"
              required
              value="havent_met"
            />
            <Radio
              color="blue-100"
              id="planning-to-meet"
              label="Not yet, but we're still planning to meet up."
              name="status"
              required
              value="planning_to_meet"
            />
          </Radio.Group>
        </Field>

        <Field
          description="Share any feedback you have about your experience giving/receiving help."
          label="Feedback"
          labelFor="feedback"
        >
          <Textarea
            id="feedback"
            name="feedback"
            placeholder="How did the help session go?"
          />
        </Field>

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Submit</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
