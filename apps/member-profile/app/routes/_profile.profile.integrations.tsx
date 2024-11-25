import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { ExternalLink } from 'react-feather';

import { Pill, Text } from '@oyster/ui';
import { run } from '@oyster/utils';

import {
  ProfileHeader,
  ProfileSection,
  ProfileTitle,
} from '@/shared/components/profile';
import { ENV } from '@/shared/constants.server';
import { getMember } from '@/shared/queries';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = user(session);

  const member = await getMember(id)
    .select(['githubId'])
    .executeTakeFirstOrThrow();

  const githubOauthUri = run(() => {
    const url = new URL('https://github.com/login/oauth/authorize');

    url.searchParams.set('client_id', ENV.GITHUB_OAUTH_CLIENT_ID || '');

    return url.toString();
  });

  return json({
    isGithubConnected: !!member.githubId,
    githubOauthUri,
  });
}

export default function IntegrationsPage() {
  const { githubOauthUri, isGithubConnected } = useLoaderData<typeof loader>();

  return (
    <ProfileSection>
      <ProfileHeader>
        <ProfileTitle>Integrations</ProfileTitle>
      </ProfileHeader>

      <ul className="grid grid-cols-1 gap-4 @[800px]:grid-cols-2">
        <IntegrationCard
          description={
            <>
              Connect your GitHub account to get rewarded when you contribute to
              the{' '}
              <a
                className="link"
                href="https://github.com/colorstackorg/oyster"
                target="_blank"
              >
                Oyster codebase
              </a>
              .
            </>
          }
          externalUri="https://github.com"
          isConnected={isGithubConnected}
          logo="/images/github.svg"
          name="GitHub"
          oauthUri={githubOauthUri}
        />
      </ul>
    </ProfileSection>
  );
}

type IntegrationCardProps = {
  description: string | React.ReactElement;
  externalUri: `https://${string}`;
  isConnected: boolean;
  logo: `/images/${string}.svg`;
  name: string;
  oauthUri: string;
};

// TODO: There's a lot of custom styling here that really should be in the
// design system. We should refactor at some point (we also need an actual
// design system lol).

function IntegrationCard({
  description,
  externalUri,
  isConnected,
  logo,
  name,
  oauthUri,
}: IntegrationCardProps) {
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-gray-200 p-4">
      <header className="flex items-center justify-between gap-4">
        <img className="w-19 h-10" src={logo} />

        {isConnected ? (
          <Pill color="success">Connected</Pill>
        ) : (
          <a
            className="rounded-full border border-gray-200 px-2 py-1 text-sm hover:bg-gray-100"
            href={oauthUri}
          >
            Connect
          </a>
        )}
      </header>

      <div>
        <Text variant="lg" weight="600">
          {name}
        </Text>

        <a
          className="flex items-center gap-1 text-sm text-gray-500 hover:underline"
          href={externalUri}
          target="_blank"
        >
          {externalUri.replace('https://', '')} <ExternalLink size="16" />
        </a>
      </div>

      <Text color="gray-500" variant="sm">
        {description}
      </Text>
    </li>
  );
}
