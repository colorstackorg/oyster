import { Info, Loader } from 'react-feather';
import { match } from 'ts-pattern';

import { Pill } from '@oyster/ui';

type HelpRequestStatusProps = {
  status: string;
};

export function HelpRequestStatus({ status }: HelpRequestStatusProps) {
  const color = match(status)
    .with('open', () => 'amber-100' as const)
    .with('pending', () => 'orange-100' as const)
    .with('complete', () => 'lime-100' as const)
    .with('incomplete', () => 'red-100' as const)
    .otherwise(() => 'gray-100' as const);

  const label = match(status)
    .with('open', () => 'Help Needed')
    .with('pending', () => 'Helper Assigned')
    .with('complete', () => 'Help Received')
    .with('incomplete', () => 'Help Not Received')
    .otherwise(() => 'Unknown');

  return (
    <Pill color={color}>
      <Loader className="inline align-middle" size={14} /> {label}
    </Pill>
  );
}

type HelpRequestTypeProps = {
  type: string;
};

export function HelpRequestType({ type }: HelpRequestTypeProps) {
  const color = match(type)
    .with('career_advice', () => 'pink-100' as const)
    .with('resume_review', () => 'blue-100' as const)
    .with('mock_interview', () => 'purple-100' as const)
    .otherwise(() => 'gray-100' as const);

  const label = match(type)
    .with('career_advice', () => 'Career Advice')
    .with('resume_review', () => 'Resume Review')
    .with('mock_interview', () => 'Mock Interview')
    .otherwise(() => 'Unknown');

  return (
    <Pill color={color}>
      <Info className="inline align-middle" size={14} /> {label}
    </Pill>
  );
}
