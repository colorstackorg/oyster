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

import { requestHelp, RequestHelpInput } from '@oyster/core/peer-help';
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

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  return json({
    memberId: user(session),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, RequestHelpInput);

  if (!result.ok) {
    return json({ errors: result.errors }, { status: 400 });
  }

  const requestResult = await requestHelp(result.data);

  if (!requestResult.ok) {
    return json({ error: requestResult.error }, { status: requestResult.code });
  }

  toast(session, {
    message: 'Help request submitted!',
  });

  const url = new URL(request.url);

  url.pathname = generatePath(Route['/peer-help/:id'], {
    id: requestResult.data.id,
  });

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

// Page

export default function RequestHelpModal() {
  const { memberId } = useLoaderData<typeof loader>();
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
        <HelpRequestTypeField error={errors.type} name="type" />
        <HelpRequestDescriptionField
          error={errors.description}
          name="description"
        />

        <input type="hidden" name="memberId" value={memberId} />

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Request</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
