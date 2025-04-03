import { type PropsWithChildren } from 'react';
import { Info, Loader } from 'react-feather';
import { match } from 'ts-pattern';

import {
  type HelpRequestStatus as HelpRequestStatusType,
  type HelpRequestType as HelpRequestTypeType,
} from '@oyster/core/peer-help';
import {
  cx,
  Field,
  type FieldProps,
  Pill,
  Radio,
  Text,
  Textarea,
} from '@oyster/ui';

// Information

type HelpRequestDescriptionProps = PropsWithChildren<{
  className?: string;
}>;

export function HelpRequestDescription({
  children,
  className,
}: HelpRequestDescriptionProps) {
  return (
    <Text
      className={cx('border-l border-gray-300 pl-2', className)}
      color="gray-500"
      variant="sm"
    >
      {children}
    </Text>
  );
}

type HelpRequestStatusProps = {
  status: HelpRequestStatusType;
};

export function HelpRequestStatus({ status }: HelpRequestStatusProps) {
  const color = match(status)
    .with('requested', () => 'amber-100' as const)
    .with('offered', () => 'orange-100' as const)
    .with('received', () => 'lime-100' as const)
    .with('not_received', () => 'red-100' as const)
    .otherwise(() => 'gray-100' as const);

  const label = match(status)
    .with('requested', () => 'Requested')
    .with('offered', () => 'Offered')
    .with('received', () => 'Received')
    .with('not_received', () => 'Not Received')
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

// Help Request Form

export function HelpRequestDescriptionField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Field
      description="What do you need help with specifically? Do you want to meet up synchronously or asynchronously? If synchronously, when are you available? Do you have a preference on the helper's background/experience?"
      error={error}
      label="Please add context to your request."
      labelFor={name}
      required
    >
      <Textarea
        defaultValue={defaultValue}
        id={name}
        minLength={250}
        name={name}
        required
      />
    </Field>
  );
}

export function HelpRequestTypeField({
  defaultValue,
  error,
  name,
}: FieldProps<string>) {
  return (
    <Field
      description="We currently only support these areas of need."
      error={error}
      label="What type of help do you need?"
      labelFor={name}
      required
    >
      <Radio.Group defaultValue={defaultValue}>
        <Radio
          color="pink-100"
          id={type('career_advice')}
          label="Career Advice"
          name={name}
          required
          value={type('career_advice')}
        />
        <Radio
          color="purple-100"
          id={type('mock_interview')}
          label="Mock Interview"
          name={name}
          required
          value={type('mock_interview')}
        />
        <Radio
          color="blue-100"
          id={type('resume_review')}
          label="Resume Review"
          name={name}
          required
          value={type('resume_review')}
        />
      </Radio.Group>
    </Field>
  );
}

function type(value: HelpRequestTypeType) {
  return value;
}
