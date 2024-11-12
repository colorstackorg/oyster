import { type ActionFunctionArgs, redirect } from '@remix-run/node';
import { Form, useNavigate, useSearchParams } from '@remix-run/react';
import { useState } from 'react';

import { Button, Modal } from '@oyster/ui';

import { deleteResource } from '@/modules/resource/use-cases/delete-resource';
import { Route } from '@/shared/constants';

export async function action({ params, request }: ActionFunctionArgs) {
  const { id } = params;

  if (!id) throw new Error('Resource ID is required');

  await deleteResource(id);

  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();

  return redirect(
    `${Route['/resources']}${searchParams ? `?${searchParams}` : ''}`
  );
}

export default function DeleteResource() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isDeleting, setIsDeleting] = useState(false);

  const getReturnPath = () => {
    const currentParams = searchParams.toString();

    return `${Route['/resources']}${currentParams ? `?${currentParams}` : ''}`;
  };

  return (
    <Modal onCloseTo={getReturnPath()}>
      <Modal.Header>
        <Modal.Title>
          Are you sure you want to delete this resource?
        </Modal.Title>
      </Modal.Header>
      <Modal.Description>This action cannot be undone.</Modal.Description>
      <Form method="post" onSubmit={() => setIsDeleting(true)}>
        <Button.Group>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(getReturnPath())}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </Button.Group>
      </Form>
    </Modal>
  );
}
