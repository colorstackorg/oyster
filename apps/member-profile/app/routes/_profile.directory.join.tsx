import { type PropsWithChildren } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'react-feather';
import {
  Link,
  type LoaderFunctionArgs,
  Outlet,
  useLocation,
} from 'react-router';
import { match } from 'ts-pattern';

import { Button, cx, Modal, Text } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return null;
}

export default function JoinDirectoryLayout() {
  const { pathname } = useLocation();

  return (
    <Modal onCloseTo={Route['/home']}>
      <Modal.Header>
        <Modal.Title>Welcome to the Member Directory! 🤝</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      {pathname !== Route['/directory/join'] && <ProgressBar />}
      <Outlet />
    </Modal>
  );
}

function ProgressBar() {
  return (
    <div className="mx-auto my-4 grid w-full max-w-md grid-cols-7 items-center">
      <ProgressBarStep step="1" />
      <ProgressBarDivider />
      <ProgressBarStep step="2" />
      <ProgressBarDivider />
      <ProgressBarStep step="3" />
      <ProgressBarDivider />
      <ProgressBarStep step="4" />
    </div>
  );
}

type ProgressStep = '1' | '2' | '3' | '4';

type ProgressBarStepProps = {
  step: ProgressStep;
};

function ProgressBarStep({ step }: ProgressBarStepProps) {
  const status = useStepStatus(step);

  return (
    <div className="flex flex-col items-center gap-2">
      <p
        className={cx(
          'flex h-9 w-9 items-center justify-center rounded-full border-2',
          status === 'active' || status === 'completed'
            ? 'border-primary bg-primary text-white'
            : 'border-gray-200 text-gray-500'
        )}
      >
        {status === 'completed' ? <Check size={20} /> : parseInt(step)}
      </p>

      <Text variant="sm">
        {match(step)
          .with('1', () => 'General')
          .with('2', () => 'Personal')
          .with('3', () => 'Socials')
          .with('4', () => 'Icebreakers')
          .exhaustive()}
      </Text>
    </div>
  );
}

type StepStatus = 'active' | 'completed' | 'inactive';

function useStepStatus(step: ProgressStep): StepStatus {
  const { pathname } = useLocation();

  const activeStep = match(pathname)
    .with(Route['/directory/join/1'], () => '1' as const)
    .with(Route['/directory/join/2'], () => '2' as const)
    .with(Route['/directory/join/3'], () => '3' as const)
    .with(Route['/directory/join/4'], () => '4' as const)
    .with(Route['/directory/join/finish'], () => 'finish' as const)
    .run();

  if (activeStep === 'finish') {
    return 'completed';
  }

  if (step === activeStep) {
    return 'active';
  }

  if (step < activeStep) {
    return 'completed';
  }

  return 'inactive';
}

function ProgressBarDivider() {
  return <div className="-mt-7 h-[2px] w-full bg-gray-200" />;
}

// Shared

export function JoinDirectoryBackButton({
  children = 'Back',
  to,
}: PropsWithChildren<{
  to:
    | (typeof Route)['/directory/join/1']
    | (typeof Route)['/directory/join/2']
    | (typeof Route)['/directory/join/3'];
}>) {
  return (
    <Button.Slot variant="secondary">
      <Link to={to}>
        <ArrowLeft size={20} /> {children}
      </Link>
    </Button.Slot>
  );
}

export function JoinDirectoryNextButton({
  children = 'Next',
}: PropsWithChildren) {
  return (
    <Button.Submit>
      {children} <ArrowRight size={20} />
    </Button.Submit>
  );
}
