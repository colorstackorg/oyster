import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { GITHUB_OAUTH_URL } from 'app/shared/constants';
import { getMember } from 'app/shared/queries';
import { GitHub, Smile } from 'react-feather';

import { Button, Text } from '@oyster/ui';

import {
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '../shared/components/profile';
import { ENV } from '../shared/constants.server';
import { ensureUserAuthenticated, user } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = user(session);

  const clientId = ENV.GITHUB_OAUTH_CLIENT_ID;

  const student = await getMember(id)
    .select(['githubId'])
    .executeTakeFirstOrThrow();

  return json({ student, clientId });
}

export default function IntegrationsPage() {
  const { student, clientId } = useLoaderData<typeof loader>();

  const githubURL = `${GITHUB_OAUTH_URL}?client_id=${clientId}`;

  return (
    <ProfileSection>
      <ProfileHeader>
        <ProfileTitle>Integrations</ProfileTitle>
      </ProfileHeader>

      {student.githubId ? (
        <Button disabled>
          Github connected <Smile size={20} />
        </Button>
      ) : (
        <Button>
          <GitHub size={20} />
          <a href={githubURL}>Add your Github account</a>
        </Button>
      )}
    </ProfileSection>
  );
}
