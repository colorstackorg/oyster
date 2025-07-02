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
} from '@remix-run/react';

import {
  finishHelpRequest,
  FinishHelpRequestInput,
  type HelpRequestStatus,
} from '@oyster/core/peer-help';
import { db } from '@oyster/db';
import {
  Button,
  ErrorMessage,
  Field,
  getErrors,
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
  const session = await ensureUserAuthenticated(request);

  const helpRequest = await db
    .selectFrom('helpRequests')
    .select(['description', 'helpeeId', 'helperId', 'id'])
    .where('id', '=', params.id as string)
    .executeTakeFirst();

  if (!helpRequest) {
    throw new Response(null, {
      status: 404,
      statusText: 'The help request you are looking for does not exist.',
    });
  }

  const memberId = user(session);

  if (helpRequest.helpeeId !== memberId) {
    throw redirect(
      generatePath(Route['/peer-help/:id'], { id: helpRequest.id })
    );
  }

  return {
    ...helpRequest,
    memberId,
  };
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, FinishHelpRequestInput);

  if (!result.ok) {
    return json(result, { status: 400 });
  }

  const id = params.id as string;

  const finishResult = await finishHelpRequest(id, result.data);

  if (!finishResult.ok) {
    return json({ error: finishResult.error }, { status: finishResult.code });
  }

  toast(session, {
    message: 'Thank you for checking in!',
  });

  const url = new URL(request.url);

  url.pathname = generatePath(Route['/peer-help/:id'], { id });

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function FinishHelpRequestForm() {
  const { memberId } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Form method="post" className="form rounded-xl bg-gray-50 p-4">
      <Field
        description="If you are still in the process of receiving help, please hold off on submitting this form until you are able to receive help."
        error={errors.status}
        label="Did you receive the help that you were looking for?"
        labelFor="status"
        required
      >
        <Radio.Group>
          <Radio
            color="lime-100"
            id={status('completed')}
            label="Yes, I received help."
            name="status"
            required
            value={status('completed')}
          />
          <Radio
            color="red-100"
            id={status('not_completed')}
            label="No, I didn't receive help."
            name="status"
            required
            value={status('not_completed')}
          />
        </Radio.Group>
      </Field>

      <Field
        description="Share any feedback you have about your experience receiving help."
        error={errors.feedback}
        label="Feedback"
        labelFor="feedback"
      >
        <Textarea
          id="feedback"
          name="feedback"
          placeholder="I was happy with this but I think this could have gone better..."
        />
      </Field>

      <input type="hidden" name="memberId" value={memberId} />

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Group>
        <Button.Submit>Submit</Button.Submit>
      </Button.Group>
    </Form>
  );
}

function status(value: HelpRequestStatus) {
  return value;
}
