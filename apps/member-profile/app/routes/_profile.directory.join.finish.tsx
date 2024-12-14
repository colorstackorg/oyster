import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { generatePath, Link, useLoaderData } from '@remix-run/react';
import { ArrowRight, Eye } from 'react-feather';

import { Button, Text } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);

  return json({
    memberId,
  });
}

export default function DirectoryJoinedConfirmation() {
  const { memberId } = useLoaderData<typeof loader>();

  return (
    <div className="form mx-auto max-w-lg items-center">
      <div className="mb-4">
        <Text className="text-center" color="gray-500">
          Congratulations, you've succesfully joined the Member Directory! 🎉
          It's start time to start connecting with other members!
        </Text>
      </div>

      <Button.Group spacing="center">
        <Button.Slot variant="secondary">
          <Link to={Route['/directory']}>
            <ArrowRight size={20} /> Explore the Directory
          </Link>
        </Button.Slot>

        <Button.Slot variant="primary">
          <Link to={generatePath(Route['/directory/:id'], { id: memberId })}>
            <Eye size={20} /> Preview My Profile
          </Link>
        </Button.Slot>
      </Button.Group>
    </div>
  );
}
