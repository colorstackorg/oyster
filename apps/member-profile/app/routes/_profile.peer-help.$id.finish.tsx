import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';

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
    .executeTakeFirst();

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
            id="met"
            label="Yes, I received help."
            name="status"
            required
            value="met"
          />
          <Radio
            color="red-100"
            id="havent-met"
            label="No, I didn't receive help."
            name="status"
            required
            value="havent_met"
          />
        </Radio.Group>
      </Field>

      <Field
        description="Share any feedback you have about your experience receiving help."
        label="Feedback"
        labelFor="feedback"
      >
        <Textarea
          id="feedback"
          name="feedback"
          placeholder="I was happy with this but I think this could have gone better..."
        />
      </Field>

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Group>
        <Button.Submit>Submit</Button.Submit>
      </Button.Group>
    </Form>
  );
}
