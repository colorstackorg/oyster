import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, Outlet, useLocation } from '@remix-run/react';
import { type PropsWithChildren } from 'react';
import { ArrowLeft, ArrowRight } from 'react-feather';
import { match } from 'ts-pattern';

import { Button, Public, Text, type TextProps } from '@oyster/ui';
import { Progress } from '@oyster/ui/progress';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export default function OnboardingLayout() {
  return (
    <Public.Content layout="lg">
      <OnboardingProgress />
      <Outlet />
    </Public.Content>
  );
}

function OnboardingProgress() {
  const { pathname } = useLocation();

  if (pathname === Route['/onboarding']) {
    return null;
  }

  const value = match(pathname)
    .with(Route['/onboarding/general'], () => 10)
    .with(Route['/onboarding/emails'], () => 20)
    .with(Route['/onboarding/emails/verify'], () => 40)
    .with(Route['/onboarding/education'], () => 60)
    .with(Route['/onboarding/socials'], () => 80)
    .with(Route['/onboarding/work'], () => 90)
    .with(Route['/onboarding/slack'], () => 95)
    .otherwise(() => 0);

  return <Progress value={value} />;
}

// Reusable

type BackButtonProps = {
  to:
    | (typeof Route)['/onboarding']
    | (typeof Route)['/onboarding/education']
    | (typeof Route)['/onboarding/emails']
    | (typeof Route)['/onboarding/emails/verify']
    | (typeof Route)['/onboarding/general']
    | (typeof Route)['/onboarding/socials']
    | (typeof Route)['/onboarding/work'];
};

export function BackButton({ to }: BackButtonProps) {
  return (
    <Button.Slot variant="secondary">
      <Link to={to}>
        <ArrowLeft className="size-5" /> Back
      </Link>
    </Button.Slot>
  );
}

type ContinueButtonProps = {
  disabled?: boolean;
  label?: string;
};

export function ContinueButton({
  disabled,
  label = 'Continue',
}: ContinueButtonProps) {
  return (
    <Button.Submit disabled={disabled}>
      {label} <ArrowRight className="size-5" />
    </Button.Submit>
  );
}

export function OnboardingButtonGroup({ children }: PropsWithChildren) {
  return (
    <div className="mt-4">
      <Button.Group spacing="between">{children}</Button.Group>
    </div>
  );
}

export function SectionDescription(props: TextProps) {
  return <Text color="gray-500" {...props} />;
}

export function SectionTitle(props: TextProps) {
  return <Text variant="xl" {...props} />;
}
