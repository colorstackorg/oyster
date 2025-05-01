import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { ArrowRight } from 'react-feather';

import { db } from '@oyster/db';
import { Button, Text } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const member = await db
    .selectFrom('students')
    .select('firstName')
    .where('id', '=', user(session))
    .executeTakeFirstOrThrow();

  return json({ member });
}

export default function OnboardingLandingPage() {
  const { member } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex h-48 w-48 items-center justify-center rounded-full bg-lime-50">
        <img
          alt="Celebration graphic"
          className="h-32 w-32"
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'%3E%3Cg fill='none' stroke='%2365a30d' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M64 20v88M20 64h88M35 35l58 58M35 93l58-58'/%3E%3Ccircle cx='64' cy='64' r='40'/%3E%3Ccircle cx='64' cy='64' r='20'/%3E%3C/g%3E%3C/svg%3E"
        />
      </div>

      <div className="space-y-4">
        <Text variant="2xl" weight="500">
          Welcome to ColorStack, {member.firstName}! 🎉
        </Text>

        <Text color="gray-500">
          Congratulations on becoming a member! We just need a few more details
          to complete your profile and get you access to our Slack community.
          This should only take about 5 minutes.
        </Text>
      </div>

      <div className="w-full max-w-sm">
        <Button.Group>
          <Button.Slot variant="primary" className="w-full">
            <Link to={Route['/onboarding/general']}>
              Get Started <ArrowRight className="size-5" />
            </Link>
          </Button.Slot>
        </Button.Group>
      </div>
    </div>
  );
}
