import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form,
  generatePath,
  Link,
  useActionData,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import { Check, ChevronLeft } from 'react-feather';

import { acceptHelpRequest } from '@oyster/core/peer-help';
import { db } from '@oyster/db';
import { Button, ErrorMessage, IconButton, Modal, Text } from '@oyster/ui';

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
    .select(['helpRequests.id'])
    .where('helpRequests.id', '=', params.id as string)
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
  const helperId = user(session);

  const result = await acceptHelpRequest(params.id as string, { helperId });

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'You have accepted the help request!',
  });

  const url = new URL(request.url);

  url.pathname = Route['/peer-help'];

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function HelpRequestModal() {
  const { id } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/peer-help'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <div className="flex items-center gap-1">
          <IconButton.Slot backgroundColorOnHover="gray-100" size="sm">
            <Link to={generatePath(Route['/peer-help/:id'], { id })}>
              <ChevronLeft />
            </Link>
          </IconButton.Slot>

          <Modal.Title>Offer Help</Modal.Title>
        </div>
        <Modal.CloseButton />
      </Modal.Header>

      <div className="flex flex-col gap-8 px-4">
        <div className="flex flex-col gap-1">
          <Text weight="500">Next Steps</Text>
          <Text color="gray-500">
            If you confirm, the{' '}
            <Link
              className="link"
              target="_blank"
              to="https://colorstack.slack.com"
            >
              ColorStack Slack bot
            </Link>{' '}
            will introduce you to NAME HERE by sending a group DM to you both.
            From there, you two can coordinate your help session.
          </Text>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <Text weight="500">Help Agreement</Text>
          <Text color="gray-500">
            By proceeding, I acknowledge and agree that:
          </Text>
          <ul className="ml-6 list-disc">
            <li>
              <Text color="gray-500" variant="sm">
                I have read the help request description in full.
              </Text>
            </li>
            <li>
              <Text color="gray-500" variant="sm">
                I am willing and able to help with this request to the best of
                my abilities.
              </Text>
            </li>
            <li>
              <Text color="gray-500" variant="sm">
                I will be responsive and coordinate with the requestor, whether
                meeting synchronously or asynchronously.
              </Text>
            </li>
            <li>
              <Text color="gray-500" variant="sm">
                I will maintain professionalism and respect when communicating
                with the requestor.
              </Text>
            </li>
          </ul>
        </div>

        <Form className="form" method="post">
          <ErrorMessage>{actionData?.error}</ErrorMessage>

          <Button.Group flexDirection="row-reverse">
            <Button.Submit size="small">
              I Agree & Confirm <Check />
            </Button.Submit>
          </Button.Group>
        </Form>
      </div>
    </Modal>
  );
}
