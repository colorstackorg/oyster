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

import { deleteOpportunity } from '@oyster/core/opportunities';
import { db } from '@oyster/db';
import { Button, Form, getErrors, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);

  const hasEditPermission = await db
    .selectFrom('opportunities')
    .where('opportunities.id', '=', params.id as string)
    .where((eb) => {
      return eb.or([
        eb('opportunities.postedBy', '=', memberId),
        eb.exists(() => {
          return eb
            .selectFrom('admins')
            .where('admins.memberId', '=', memberId)
            .where('admins.deletedAt', 'is not', null);
        }),
      ]);
    })
    .executeTakeFirst();

  if (!hasEditPermission) {
    throw new Response(null, {
      status: 403,
      statusText: 'You do not have permission to delete this opportunity.',
    });
  }

  const opportunity = await db
    .selectFrom('opportunities')
    .leftJoin('companies', 'companies.id', 'opportunities.companyId')
    .select([
      'companies.name as companyName',
      'opportunities.description',
      'opportunities.title',
    ])
    .where('opportunities.id', '=', params.id as string)
    .executeTakeFirst();

  if (!opportunity) {
    throw new Response(null, {
      status: 404,
      statusText: 'The opportunity you are trying to delete does not exist.',
    });
  }

  return json({ opportunity });
}

export async function action({ params, request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);

  const id = params.id as string;

  await deleteOpportunity(id);

  return redirect('/opportunities');
}

export default function DeleteOpportunity() {
  const [searchParams] = useSearchParams();
  const { opportunity } = useLoaderData<typeof loader>();
  const { error } = getErrors(useActionData<typeof action>());

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
