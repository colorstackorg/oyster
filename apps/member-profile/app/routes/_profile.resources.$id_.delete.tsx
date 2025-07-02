import {
  type ActionFunctionArgs,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
  useLoaderData,
  useSearchParams,
} from 'react-router';

import { deleteResource } from '@oyster/core/resources/server';
import { db } from '@oyster/db';
import { Button, ErrorMessage, getErrors, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const resource = await db
    .selectFrom('resources')
    .select(['title'])
    .where('id', '=', params.id as string)
    .where('postedBy', '=', user(session))
    .executeTakeFirst();

  if (!resource) {
    throw new Response(null, {
      status: 404,
      statusText: 'The resource you are looking for does not exist.',
    });
  }

  return resource;
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await deleteResource(params.id as string);

  toast(session, {
    message: 'Resource deleted successfully.',
  });

  const url = new URL(request.url);

  url.pathname = Route['/resources'];

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function DeleteResourceModal() {
  const { title } = useLoaderData<typeof loader>();
  const { error } = getErrors(useActionData<typeof action>());
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/resources'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Delete Resource</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Are you sure you want to delete "{title}"? This action cannot be undone.
      </Modal.Description>

      <Form className="form" method="post">
        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit color="error">Delete</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
