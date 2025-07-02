import { type PropsWithChildren } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'react-feather';
import {
  Link,
  type LoaderFunctionArgs,
  Outlet,
  redirect,
  useLocation,
} from 'react-router';

import { db } from '@oyster/db';
import { Button, cx, Public, Text, type TextProps } from '@oyster/ui';

import { ONBOARDING_FLOW_LAUNCH_DATE, Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  SESSION,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    message:
      'Welcome to ColorStack! Please log in using your school email to finish filling out your profile.',
  });

  const member = await db
    .selectFrom('students')
    .select(['acceptedAt', 'onboardedAt'])
    .where('id', '=', user(session))
    .executeTakeFirstOrThrow();

  if (member.onboardedAt || member.acceptedAt < ONBOARDING_FLOW_LAUNCH_DATE) {
    const to = session.get(SESSION.REDIRECT_URL) || Route['/home'];

    throw redirect(to, {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  }

  return null;
}

export default function OnboardingLayout() {
  return (
    <Public.Layout>
      <Public.Content layout="lg">
        <ProgressBar />
        <Outlet />
      </Public.Content>
    </Public.Layout>
  );
}

// Progress Bar

function ProgressBar() {
  const { pathname } = useLocation();

  if (pathname === Route['/onboarding']) {
    return null;
  }

  return (
    <div className="mx-auto my-4 grid w-full grid-cols-11 items-center sm:px-4">
      <ProgressBarStep step="1" />
      <ProgressBarLine step="2" />
      <ProgressBarStep step="2" />
      <ProgressBarLine step="3" />
      <ProgressBarStep step="3" />
      <ProgressBarLine step="4" />
      <ProgressBarStep step="4" />
    </div>
  );
}

type ProgressStep = '1' | '2' | '3' | '4';

type ProgressBarStepProps = {
  step: ProgressStep;
};

function ProgressBarStep({ step }: ProgressBarStepProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <ProgressBarStepCircle step={step} />
      <ProgressBarStepLabel step={step} />
    </div>
  );
}

function ProgressBarStepCircle({ step }: ProgressBarStepProps) {
  const status = useStepStatus(step);

  return (
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
  );
}

const STEP_TO_ROUTE_MAP: Record<ProgressStep, string> = {
  '1': Route['/onboarding/general'],
  '2': Route['/onboarding/emails'],
  '3': Route['/onboarding/community'],
  '4': Route['/onboarding/slack'],
};

const STEP_LABEL_MAP: Record<ProgressStep, string> = {
  '1': 'General',
  '2': 'Email',
  '3': 'Community',
  '4': 'Slack',
};

function ProgressBarStepLabel({ step }: ProgressBarStepProps) {
  const status = useStepStatus(step);

  const label = STEP_LABEL_MAP[step];
  const route = STEP_TO_ROUTE_MAP[step];

  return (
    <Text variant="xs">
      {status === 'completed' ? <Link to={route}>{label}</Link> : label}
    </Text>
  );
}

type ProgressBarLineProps = {
  step: ProgressStep;
};

function ProgressBarLine({ step }: ProgressBarLineProps) {
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

// Use Step Status

const ROUTE_TO_STEP_MAP: Record<string, ProgressStep> = {
  [Route['/onboarding/general']]: '1',
  [Route['/onboarding/emails']]: '2',
  [Route['/onboarding/emails/verify']]: '2',
  [Route['/onboarding/community']]: '3',
  [Route['/onboarding/slack']]: '4',
};

type StepStatus = 'active' | 'completed' | 'inactive';

/**
 * Returns the status of the step based on the current pathname.
 *
 * @param step - The step to check the status of.
 * @returns The status of the step.
 */
function useStepStatus(step: ProgressStep): StepStatus {
  const { pathname } = useLocation();

  const activeStep = ROUTE_TO_STEP_MAP[pathname];

  if (step === activeStep) {
    return 'active';
  }

  if (step < activeStep) {
    return 'completed';
  }

  return 'inactive';
}

// Reusable Components

type BackButtonProps = {
  to:
    | (typeof Route)['/onboarding']
    | (typeof Route)['/onboarding/community']
    | (typeof Route)['/onboarding/emails']
    | (typeof Route)['/onboarding/emails/verify']
    | (typeof Route)['/onboarding/general'];
};

export function OnboardingBackButton({ to }: BackButtonProps) {
  return (
    <Button.Slot variant="secondary">
      <Link to={to}>
        <ArrowLeft className="size-5" /> Back
      </Link>
    </Button.Slot>
  );
}

export function OnboardingButtonGroup({ children }: PropsWithChildren) {
  return (
    <div className="mt-4">
      <Button.Group spacing="between">{children}</Button.Group>
    </div>
  );
}

type ContinueButtonProps = {
  disabled?: boolean;
  label?: string;
};

export function OnboardingContinueButton({
  disabled,
  label = 'Continue',
}: ContinueButtonProps) {
  return (
    <Button.Submit disabled={disabled}>
      {label} <ArrowRight className="size-5" />
    </Button.Submit>
  );
}

export function OnboardingSectionDescription(props: TextProps) {
  return <Text color="gray-500" {...props} />;
}

export function OnboardingSectionTitle(props: TextProps) {
  return <Text variant="xl" {...props} />;
}
