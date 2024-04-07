import { json, type LoaderFunctionArgs } from '@remix-run/node';

import { Modal } from '@oyster/ui';

import { ensureUserAuthenticated } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export default function ConfirmationPage() {
  return (
    <>
      <Modal.Header>
        <Modal.Title>Swag Pack Ordered! 🎉</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Congratulations! Your ColorStack swag pack is on its way to you. Please
        allow 2-4 weeks for shipping and processing.
      </Modal.Description>
    </>
  );
}
