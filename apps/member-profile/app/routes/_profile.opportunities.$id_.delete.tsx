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

import {
  deleteOpportunity,
  getOpportunity,
  hasOpportunityWritePermission,
} from '@oyster/core/opportunities';
import { Button, Form, getErrors, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const opportunity = await getOpportunity(params.id as string);

  if (!opportunity) {
    throw new Response(null, {
      status: 404,
      statusText: 'The opportunity you are trying to delete does not exist.',
    });
  }

  const hasPermission = await hasOpportunityWritePermission({
    memberId: user(session),
    opportunityId: params.id as string,
  });

  if (!hasPermission) {
    throw new Response(null, {
      status: 403,
      statusText: 'You do not have permission to delete this opportunity.',
    });
  }

  return json({ opportunity });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await deleteOpportunity({
    memberId: user(session),
    opportunityId: params.id as string,
  });

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  const url = new URL(request.url);

  url.pathname = Route['/opportunities'];

  return redirect(url.toString());
}

export default function DeleteOpportunity() {
  const { opportunity } = useLoaderData<typeof loader>();
  const { error } = getErrors(useActionData<typeof action>());
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/opportunities'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Delete Opportunity</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Are you sure you want to delete this opportunity: {opportunity.title} (
        {opportunity.companyName})?
      </Modal.Description>

      <RemixForm className="form" method="post">
        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit color="error">Delete</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
