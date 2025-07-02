import {
  type ActionFunctionArgs,
  data,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
  useLoaderData,
  useSearchParams,
} from 'react-router';

import { deleteOffer, hasOfferWritePermission } from '@oyster/core/offers';
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

  const offer = await db
    .selectFrom('fullTimeOffers')
    .leftJoin('companies', 'companies.id', 'fullTimeOffers.companyId')
    .select(['companies.name as companyName'])
    .where('fullTimeOffers.id', '=', params.id as string)
    .executeTakeFirst();

  if (!offer) {
    throw new Response(null, {
      status: 404,
      statusText: 'The full-time offer you are looking for does not exist.',
    });
  }

  const hasPermission = await hasOfferWritePermission({
    memberId: user(session),
    offerId: params.id as string,
  });

  if (!hasPermission) {
    throw new Response(null, {
      status: 403,
      statusText: 'You do not have permission to delete this full-time offer.',
    });
  }

  return offer;
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await deleteOffer({
    memberId: user(session),
    offerId: params.id as string,
  });

  if (!result.ok) {
    return data({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'Deleted full-time offer.',
  });

  const url = new URL(request.url);

  url.pathname = Route['/offers/full-time'];

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

// UI

export default function DeleteFullTimeOffer() {
  const { companyName } = useLoaderData<typeof loader>();
  const { error } = getErrors(useActionData<typeof action>());
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/offers/full-time'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Delete Full-Time Offer</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Are you sure you want to delete this full-time offer for {companyName}?
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
