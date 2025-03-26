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
import { match } from 'ts-pattern';

import { deleteHelpRequest } from '@oyster/core/peer-help';
import { db } from '@oyster/db';
import { Button, ErrorMessage, getErrors, Modal, Pill, Text } from '@oyster/ui';
import { toTitleCase } from '@oyster/utils';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
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

  const result = await deleteHelpRequest(params.id as string);

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'Help request deleted!',
  });

  const url = new URL(request.url);

  url.pathname = Route['/peer-help'];

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function DeleteHelpRequestModal() {
  const { description, type } = useLoaderData<typeof loader>();
  const { error } = getErrors(useActionData<typeof action>());
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/peer-help'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Delete Help Request</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Are you sure you want to delete this help request?
      </Modal.Description>

      <div className="flex flex-col gap-4 border-l border-gray-300 pl-2">
        <Pill
          color={match(type)
            .with('career_advice', () => 'pink-100' as const)
            .with('resume_review', () => 'blue-100' as const)
            .with('mock_interview', () => 'purple-100' as const)
            .otherwise(() => 'gray-100' as const)}
        >
          {toTitleCase(type)}
        </Pill>

        <Text color="gray-500" variant="sm">
          {description}
        </Text>
      </div>

      <Form className="form" method="post">
        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit color="error">Delete</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
