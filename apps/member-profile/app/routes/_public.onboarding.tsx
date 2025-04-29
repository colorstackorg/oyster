import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, Outlet } from '@remix-run/react';
import { ArrowLeft, ArrowRight } from 'react-feather';
import { z } from 'zod';

import { Button, Public, Text, type TextProps } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

const Step = z
  .enum(['personal', 'education', 'social', 'work'])
  .default('personal')
  .catch('personal');

type Step = z.infer<typeof Step>;

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export default function OnboardingLayout() {
  return (
    <Public.Content layout="lg">
      <Outlet />
    </Public.Content>
  );
}

// Reusable

type BackButtonProps = {
  step: z.infer<typeof Step>;
};

export function BackButton({ step }: BackButtonProps) {
  return (
    <Button.Slot variant="secondary">
      <Link
        to={{
          pathname: Route['/onboarding'],
          search: new URLSearchParams({ step }).toString(),
        }}
      >
        <ArrowLeft className="size-5" /> Back
      </Link>
    </Button.Slot>
  );
}

type ContinueButtonProps = {
  disabled?: boolean;
};

export function ContinueButton({ disabled }: ContinueButtonProps) {
  return (
    <Button.Group>
      <Button.Submit disabled={disabled}>
        Continue <ArrowRight className="size-5" />
      </Button.Submit>
    </Button.Group>
  );
}

export function SectionDescription(props: TextProps) {
  return <Text color="gray-500" {...props} />;
}

export function SectionTitle(props: TextProps) {
  return <Text variant="xl" {...props} />;
}
