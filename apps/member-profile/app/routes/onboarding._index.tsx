import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { ArrowRight } from 'react-feather';

import { db } from '@oyster/db';
import { Button, Text } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { firstName } = await db
    .selectFrom('students')
    .select('firstName')
    .where('id', '=', user(session))
    .executeTakeFirstOrThrow();

  return json({ firstName });
}

export default function OnboardingLandingPage() {
  const { firstName } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <ul className="flex snap-x snap-mandatory gap-4 overflow-auto px-2 py-4">
        <OnboardingImage
          alt="Peer Help"
          src="/images/onboarding-peer-help.png"
        />
        <OnboardingImage
          alt="Offer Database"
          src="/images/onboarding-offers.png"
        />
        <OnboardingImage
          alt="Member Directory"
          src="/images/onboarding-directory.png"
        />
        <OnboardingImage
          alt="Companies"
          src="/images/onboarding-companies.png"
        />
        <OnboardingImage alt="Ask AI" src="/images/onboarding-ask-ai.png" />
        <OnboardingImage alt="Events" src="/images/onboarding-events.png" />
      </ul>

      <div className="flex flex-col gap-4">
        <Text variant="2xl" weight="500">
          Welcome to ColorStack, {firstName}! 🎉
        </Text>

        <Text color="gray-500">
          We just need a few more details to get you access to the Member
          Profile and our Slack workspace. This should only take about 5
          minutes!
        </Text>
      </div>

      <Button.Slot variant="primary" className="w-full">
        <Link to={Route['/onboarding/general']}>
          Get Started <ArrowRight className="size-5" />
        </Link>
      </Button.Slot>
    </div>
  );
}

type OnboardingImageProps = {
  alt: string;
  src: `/images/onboarding-${string}.png`;
};

function OnboardingImage({ alt, src }: OnboardingImageProps) {
  return (
    <li className="shrink-0 snap-center">
      <img
        alt={alt}
        className="h-[400px] w-auto rounded-md shadow-lg"
        src={src}
      />
    </li>
  );
}
