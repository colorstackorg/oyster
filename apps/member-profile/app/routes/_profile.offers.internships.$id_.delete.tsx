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
    .selectFrom('internshipOffers')
    .leftJoin('companies', 'companies.id', 'internshipOffers.companyId')
    .select(['companies.name as companyName'])
    .where('internshipOffers.id', '=', params.id as string)
    .executeTakeFirst();

  if (!offer) {
    throw new Response(null, {
      status: 404,
      statusText: 'The internship offer you are looking for does not exist.',
    });
  }

  const hasPermission = await hasOfferWritePermission({
    memberId: user(session),
    offerId: params.id as string,
  });

  if (!hasPermission) {
    throw new Response(null, {
      status: 403,
      statusText: 'You do not have permission to delete this internship offer.',
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
    return json({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'Deleted internship offer.',
  });

  const url = new URL(request.url);

  url.pathname = Route['/offers/internships'];

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

// UI

export default function DeleteInternshipOffer() {
  const { companyName } = useLoaderData<typeof loader>();
  const { error } = getErrors(useActionData<typeof action>());
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/offers/internships'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Delete Internship Offer</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Are you sure you want to delete this internship offer for {companyName}?
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
