import { json, type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { Link, Outlet, useLocation } from '@remix-run/react';
import { type PropsWithChildren } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'react-feather';

import { db } from '@oyster/db';
import { Button, cx, Public, Text, type TextProps } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    message:
      'Please log in using your school email to finish filling out your profile.',
  });

  const member = await db
    .selectFrom('students')
    .select('onboardedAt')
    .where('id', '=', user(session))
    .executeTakeFirst();

  if (member?.onboardedAt) {
    return redirect(Route['/home']);
  }

  return json({});
}

export default function OnboardingLayout() {
  return (
    <Public.Layout>
      <Public.Content layout="lg">
        <OnboardingProgress />
        <Outlet />
      </Public.Content>
    </Public.Layout>
  );
}

function OnboardingProgress() {
  const { pathname } = useLocation();

  if (pathname === Route['/onboarding']) {
    return null;
  }

  return (
    <div className="mx-auto my-4 grid w-full max-w-md grid-cols-9 items-center">
      <ProgressBarStep step="1" />
      <ProgressBarDivider step="2" />
      <ProgressBarStep step="2" />
      <ProgressBarDivider step="3" />
      <ProgressBarStep step="3" />
      <ProgressBarDivider step="4" />
      <ProgressBarStep step="4" />
      <ProgressBarDivider step="5" />
      <ProgressBarStep step="5" />
    </div>
  );
}

type ProgressStep = '1' | '2' | '3' | '4' | '5';

const STEP_ROUTE_MAP: Record<string, ProgressStep> = {
  [Route['/onboarding/general']]: '1',
  [Route['/onboarding/emails']]: '1',
  [Route['/onboarding/emails/verify']]: '1',
  [Route['/onboarding/education']]: '2',
  [Route['/onboarding/work']]: '3',
  [Route['/onboarding/socials']]: '4',
  [Route['/onboarding/slack']]: '5',
};

const STEP_LABEL_MAP: Record<ProgressStep, string> = {
  '1': 'General',
  '2': 'Education',
  '3': 'Work',
  '4': 'Community',
  '5': 'Slack',
};

type ProgressBarStepProps = {
  step: ProgressStep;
};

function ProgressBarStep({ step }: ProgressBarStepProps) {
  const status = useStepStatus(step);

  return (
    <div className="flex flex-col items-center gap-2">
      <p
        className={cx(
          'flex h-8 w-8 items-center justify-center rounded-full border-2',
          status === 'active' || status === 'completed'
            ? 'border-primary bg-primary text-white'
            : 'border-gray-200 text-gray-500'
        )}
      >
        {status === 'completed' ? <Check size={20} /> : parseInt(step)}
      </p>

      <Text variant="sm">{STEP_LABEL_MAP[step]}</Text>
    </div>
  );
}

type ProgressBarDividerProps = {
  step: ProgressStep;
};

function ProgressBarDivider({ step }: ProgressBarDividerProps) {
  const status = useStepStatus(step);

  return (
    <div
      className={cx(
        '-mt-7 h-[2px] w-full',
        'transition-colors duration-500',
        status === 'active' || status === 'completed'
          ? 'bg-primary'
          : 'bg-gray-200'
      )}
    />
  );
}

type StepStatus = 'active' | 'completed' | 'inactive';

function useStepStatus(step: ProgressStep): StepStatus {
  const { pathname } = useLocation();

  const activeStep = STEP_ROUTE_MAP[pathname as keyof typeof STEP_ROUTE_MAP];

  if (step === activeStep) {
    return 'active';
  }

  if (step < activeStep) {
    return 'completed';
  }

  return 'inactive';
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
