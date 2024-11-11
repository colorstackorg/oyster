import { useNavigate, useSearchParams } from '@remix-run/react';

import { Button, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';

export default function DeleteResource() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const returnPath = () => {
    const currentParams = searchParams.toString();

    return `${Route['/resources']}${currentParams ? `?${currentParams}` : ''}`;
  };

  const handleDelete = () => {
    // Call backend API to delete the resource here
    // Navigate to the profile/resources path after deletion
    navigate(returnPath());
  };

  return (
    <Modal onCloseTo={returnPath()}>
      <Modal.Header>
        <Modal.Title>
          Are you sure you want to delete this resource?
        </Modal.Title>
      </Modal.Header>
      <Modal.Description>This action cannot be undone.</Modal.Description>
      <Button.Group>
        <Button variant="secondary" onClick={() => navigate(returnPath())}>
          Cancel
        </Button>
        <Button onClick={handleDelete}>Delete</Button>
      </Button.Group>
    </Modal>
  );
}
