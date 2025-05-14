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

import { editHelpRequest, EditHelpRequestInput } from '@oyster/core/peer-help';
import { db } from '@oyster/db';
import {
  Button,
  ErrorMessage,
  getErrors,
  Modal,
  validateForm,
} from '@oyster/ui';

import {
  HelpRequestDescriptionField,
  HelpRequestTypeField,
} from '@/shared/components/peer-help';
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
    .select(['description', 'id', 'type'])
    .where('id', '=', params.id as string)
    .executeTakeFirst();

  if (!helpRequest) {
    throw new Response(null, {
      status: 404,
      statusText: 'The help request you are looking for does not exist.',
    });
  }

  return json({
    ...helpRequest,
    memberId: user(session),
  });
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
  const { description, id, memberId, type } = useLoaderData<typeof loader>();
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
        <HelpRequestTypeField
          defaultValue={type}
          error={errors.type}
          name="type"
        />
        <HelpRequestDescriptionField
          defaultValue={description}
          error={errors.description}
          name="description"
        />

        <input type="hidden" name="memberId" value={memberId} />

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group flexDirection="row-reverse" spacing="between">
          <Button.Submit>Edit</Button.Submit>

          <Button.Slot color="error" variant="secondary">
            <Link
              to={generatePath(Route['/peer-help/:id/delete'], { id })}
              unstable_viewTransition
            >
              Delete
            </Link>
          </Button.Slot>
        </Button.Group>
      </Form>
    </Modal>
  );
}
