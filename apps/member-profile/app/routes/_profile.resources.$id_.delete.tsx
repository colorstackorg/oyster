import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';

import { db } from '@oyster/db';
import { Button, Form, getErrors, Modal } from '@oyster/ui';

import { deleteResource } from '@/modules/resource/use-cases/delete-resource';
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

  return json(resource);
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { id } = params;

  if (!id) throw new Error('Resource ID is required');

  await deleteResource(id);

  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();

  toast(session, {
    message: 'Resource deleted successfully.',
  });

  return redirect(
    `${Route['/resources']}${searchParams ? `?${searchParams}` : ''}`,
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

export default function DeleteResourceModal() {
  const { title } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const { error } = getErrors(useActionData<typeof action>());

  const getReturnPath = () => {
    const currentParams = searchParams.toString();

    return `${Route['/resources']}${currentParams ? `?${currentParams}` : ''}`;
  };

  return (
    <Modal onCloseTo={getReturnPath()}>
      <Modal.Header>
        <Modal.Title>Delete Resource</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Are you sure you want to delete "{title}"? This action cannot be undone.
      </Modal.Description>

      <RemixForm method="post">
        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group flexDirection="row-reverse">
          <Button.Submit color="error">Delete</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
