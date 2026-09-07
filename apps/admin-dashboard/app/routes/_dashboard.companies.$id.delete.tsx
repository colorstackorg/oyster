import {
  type ActionFunctionArgs,
  data,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
  useLoaderData,
} from 'react-router';

import { deleteCompany, getCompany } from '@oyster/core/employment/server';
import { Button, ErrorMessage, getErrors, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const company = await getCompany({
    select: ['id', 'name'],
    where: { id: params.id as string },
  });

  if (!company) {
    throw new Response(null, { status: 404 });
  }

  return {
    company,
  };
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await deleteCompany(params.id as string);

  if (!result.ok) {
    return data({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'Deleted company.',
    type: 'success',
  });

  return redirect(Route['/companies'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function DeleteCompanyModal() {
  const { company } = useLoaderData<typeof loader>();
  const { error } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/companies']}>
      <Modal.Header>
        <Modal.Title>Delete Company: {company.name}</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Are you sure you want to delete this company? This will remove it from
        all resume book sponsorships. Companies with work experiences, job
        offers, or member sponsor selections cannot be deleted.
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
