import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { ArrowRight } from 'react-feather';

import { Button, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export default function JoinDirectoryIntroduction() {
  return (
    <>
      <Modal.Description>
        The Member Directory is the best way to find and connect with other
        ColorStack members. By joining, you'll be able to filter for members by
        school, location, where they work and more. To get started, we'll just
        need a few more details about you.
      </Modal.Description>

      <Button.Group>
        <Button.Slot variant="primary">
          <Link to={Route['/directory/join/1']}>
            Get Started <ArrowRight size={20} />
          </Link>
        </Button.Slot>
      </Button.Group>
    </>
  );
}
