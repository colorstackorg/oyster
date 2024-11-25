import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import React, { type PropsWithChildren, useState } from 'react';
import { CheckCircle, ChevronDown, ChevronUp, XCircle } from 'react-feather';
import { match } from 'ts-pattern';

import { db } from '@oyster/db';
import {
  ACTIVATION_REQUIREMENTS,
  type ActivationRequirement,
} from '@oyster/types';
import { Modal, Pill, Text } from '@oyster/ui';
import { run } from '@oyster/utils';

import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

type ActivationStatus = 'activated' | 'claimed' | 'ineligible' | 'in_progress';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const member = await db
    .selectFrom('students')
    .select([
      'acceptedAt',
      'activatedAt',
      'activationRequirementsCompleted',
      'claimedSwagPackAt',
    ])
    .where('id', '=', user(session))
    .executeTakeFirst();

  if (!member) {
    throw new Response(null, { status: 404 });
  }

  const tz = getTimezone(request);

  const format = 'MMMM D, YYYY';

  const acceptedAt = member.acceptedAt
    ? dayjs(member.acceptedAt).tz(tz).format(format)
    : undefined;

  const claimedSwagPackAt = member.claimedSwagPackAt
    ? dayjs(member.claimedSwagPackAt).tz(tz).format(format)
    : undefined;

  const status = run((): ActivationStatus => {
    if (member.claimedSwagPackAt) {
      return 'claimed';
    }

    // This is the date that the activation flow was updated for new members.
    if (member.acceptedAt < new Date('2023-06-09')) {
      return 'ineligible';
    }

    if (member.activatedAt) {
      return 'activated';
    }

    return 'in_progress';
  });

  return json({
    acceptedAt,
    claimedSwagPackAt,
    requirementsCompleted: member.activationRequirementsCompleted.filter(
      (requirement) => {
        return ACTIVATION_REQUIREMENTS.includes(
          requirement as ActivationRequirement
        );
      }
    ),
    status,
  });
}

export default function ActivationModal() {
  const { status } = useLoaderData<typeof loader>();

  const pill = match(status)
    .with('activated', () => {
      return <Pill color="blue-100">Activated</Pill>;
    })
    .with('claimed', () => {
      return <Pill color="lime-100">Claimed Swag Pack</Pill>;
    })
    .with('ineligible', () => {
      return <Pill color="red-100">Ineligible</Pill>;
    })
    .with('in_progress', () => {
      return <Pill color="amber-100">In Progress</Pill>;
    })
    .exhaustive();

  const body = match(status)
    .with('activated', () => <ActivatedState />)
    .with('claimed', () => <ClaimedState />)
    .with('ineligible', () => <IneligibleState />)
    .with('in_progress', () => <NotActivatedState />)
    .exhaustive();

  return (
    <Modal onCloseTo={Route['/home']}>
      <Modal.Header>
        <Modal.Title>Activation ✅</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Text color="gray-500">Status: {pill}</Text>

      <div className="flex flex-col gap-6">{body}</div>
    </Modal>
  );
}

function ActivatedState() {
  return (
    <>
      <Text color="gray-500">Great news -- you're activated! 🎉</Text>
      <ActivationList />
    </>
  );
}

function ClaimedState() {
  const { claimedSwagPackAt } = useLoaderData<typeof loader>();

  return (
    <>
      <Text color="gray-500">
        You claimed your swag pack on{' '}
        <span className="font-semibold">{claimedSwagPackAt}</span>. If you're
        interested in purchasing more swag, check out the official{' '}
        <Link className="link" target="_blank" to="https://colorstackmerch.org">
          ColorStack Merch Store
        </Link>
        !
      </Text>

      <ActivationList />
    </>
  );
}

function IneligibleState() {
  const { acceptedAt } = useLoaderData<typeof loader>();

  return (
    <Text color="gray-500">
      ColorStack launched the activation flow for members who joined after June
      9th, 2023. You joined on{' '}
      <span className="font-semibold">{acceptedAt}</span>, so unfortunately the
      activation flow does not apply to you and you are not eligible to claim a
      swag pack. So sorry about that!
    </Text>
  );
}

function NotActivatedState() {
  const { requirementsCompleted } = useLoaderData<typeof loader>();

  return (
    <>
      <Text color="gray-500">
        You've completed {requirementsCompleted.length}/
        {ACTIVATION_REQUIREMENTS.length} activation requirements. Once you hit
        all {ACTIVATION_REQUIREMENTS.length}, you will get a gift card to claim
        your FREE merch! 👀
      </Text>

      <ActivationList />
    </>
  );
}

function ActivationList() {
  const emailLink = (
    <Link className="link" target="_blank" to={Route['/profile/emails']}>
      here
    </Link>
  );

  const onboardingLink = (
    <Link
      className="link"
      target="_blank"
      to="https://calendly.com/colorstack-onboarding-ambassador/onboarding"
    >
      onboarding session
    </Link>
  );

  const upcomingEventsLink = (
    <Link className="link" target="_blank" to={Route['/events/upcoming']}>
      upcoming events
    </Link>
  );

  return (
    <ul>
      <ActivationItem label="Attend an Event" requirement="attend_event">
        <ActivationItem.Description>
          We host a monthly virtual event at the end of every month called Fam
          Friday. Stay tuned to the {upcomingEventsLink} page -- we typically
          open registration around the 3rd week of every month!
        </ActivationItem.Description>

        <ActivationItem.QuestionList>
          <ActivationItem.Question
            question="Do I have to attend all the sessions in the event?"
            answer="No, you just have to attend a minimum of 2 sessions!"
          />
          <ActivationItem.Question
            question="How long does it take for my attendance to be updated?"
            answer="Event attendance is updated within 2 hours of the event ending."
          />
          <ActivationItem.Question
            question="I waited 2 hours, but my attendance hasn't been updated. What should I do?"
            answer={
              <>
                It is likely that you joined the event with an email address
                that is not on your ColorStack account, so we couldn't associate
                the attendance with you. Please add that email to your account{' '}
                {emailLink}, then it should update!
              </>
            }
          />
        </ActivationItem.QuestionList>
      </ActivationItem>

      <ActivationItem
        label="Attend an Onboarding Session"
        requirement="attend_onboarding"
      >
        <ActivationItem.Description>
          Attend an {onboardingLink} to learn more about ColorStack and meet
          other members!
        </ActivationItem.Description>

        <ActivationItem.QuestionList>
          <ActivationItem.Question
            question="I attended an onboarding session, but my attendance hasn't been updated."
            answer="Please allow our team 72 hours to mark your attendance."
          />
        </ActivationItem.QuestionList>
      </ActivationItem>

      <ActivationItem
        label={
          <>
            Introduce Yourself in{' '}
            <Link
              className="link hover:font-semibold"
              target="_blank"
              to="https://colorstack-family.slack.com/channels/C0120DK0Y9E"
            >
              #introductions
            </Link>
          </>
        }
        requirement="send_introduction_message"
      >
        <ActivationItem.Description>
          This is an easy one -- introduce yourself in the Slack! Please follow
          the template others have used in the #introductions channel.
        </ActivationItem.Description>
      </ActivationItem>

      <ActivationItem
        label={
          <>
            Answer a QOTD in{' '}
            <Link
              className="link hover:font-semibold"
              target="_blank"
              to="https://colorstack-family.slack.com/channels/C011H0EFLMU"
            >
              #announcements
            </Link>
          </>
        }
        requirement="reply_to_announcement_message"
      >
        <ActivationItem.Description>
          We post announcements typically 2x a week. Look out for a question of
          the day (QOTD) and answer it in the thread!
        </ActivationItem.Description>

        <ActivationItem.QuestionList>
          <ActivationItem.Question
            question="Slack is not letting me reply. What should I do?"
            answer="It is likely that you are trying to post a message in the channel directly, which you are not allowed to do. You have to open the thread of the announcement and reply there."
          />
        </ActivationItem.QuestionList>
      </ActivationItem>

      <ActivationItem
        label="Reply to 2 Other Threads"
        requirement="reply_to_other_messages"
      >
        <ActivationItem.Description>
          We highly value engagement and helping others in the community! Reply
          to 2 threads in ANY channel that other ColorStack members have posted.
        </ActivationItem.Description>
      </ActivationItem>
    </ul>
  );
}

// Activation Item

type ActivationItemProps = PropsWithChildren<{
  label: React.ReactNode;
  requirement: ActivationRequirement;
}>;

const ActivationItem = ({
  children,
  label,
  requirement,
}: ActivationItemProps) => {
  // TODO: We should make an official `Accordion` component in our `ui` library
  // but for now, this will do.
  const [expanded, setExpanded] = useState(false);
  const { requirementsCompleted } = useLoaderData<typeof loader>();

  const completed = requirementsCompleted.includes(requirement);

  return (
    <li>
      <button
        className="group flex w-full cursor-pointer items-start gap-2 py-2"
        onClick={() => {
          setExpanded((value) => !value);
        }}
        type="button"
      >
        {completed ? <CheckCircle color="green" /> : <XCircle color="red" />}

        <Text className="group-hover:underline" weight="500">
          {label}
        </Text>

        <div className="ml-auto">
          {expanded ? <ChevronUp /> : <ChevronDown />}
        </div>
      </button>

      {expanded && (
        <div className="flex items-start gap-2">
          <div>
            <CheckCircle className="invisible" />
          </div>

          <div className="flex flex-col gap-4">{children}</div>
        </div>
      )}
    </li>
  );
};

ActivationItem.Description = function Description({
  children,
}: PropsWithChildren) {
  return (
    <Text color="gray-500" variant="sm">
      {children}
    </Text>
  );
};

type QuestionProps = {
  answer: React.ReactNode;
  question: React.ReactNode;
};

ActivationItem.Question = function Question({
  answer,
  question,
}: QuestionProps) {
  return (
    <li className="flex gap-1">
      <Text weight="500" variant="sm">
        Q:
      </Text>

      <div className="flex flex-col gap-1">
        <Text weight="500" variant="sm">
          {question}
        </Text>

        <Text color="gray-500" variant="sm">
          {answer}
        </Text>
      </div>
    </li>
  );
};

ActivationItem.QuestionList = function QuestionList({
  children,
}: PropsWithChildren) {
  return <ul className="flex flex-col gap-2">{children}</ul>;
};
