import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import React, { type PropsWithChildren, useState } from 'react';
import { CheckCircle, ChevronDown, ChevronUp, XCircle } from 'react-feather';
import { match } from 'ts-pattern';

import { db } from '@oyster/db';
import { type ActivationRequirement } from '@oyster/types';
import { Button, Divider, getButtonCn, Modal, Text } from '@oyster/ui';
import { run } from '@oyster/utils';

import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

type ActivationStatus =
  | 'activated'
  | 'claimed'
  | 'ineligible'
  | 'not_activated';

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

  const activatedAt = member.activatedAt
    ? dayjs(member.activatedAt).tz(tz).format(format)
    : undefined;

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

    return 'not_activated';
  });

  return json({
    acceptedAt,
    activatedAt,
    claimedSwagPackAt,
    requirementsCompleted: member.activationRequirementsCompleted,
    status,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);
}

export default function ActivationModal() {
  const { status } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/home']}>
      <Modal.Header>
        <Modal.Title>Activation Status</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <div className="flex flex-col gap-6">
        {match(status)
          .with('activated', () => <ActivatedState />)
          .with('claimed', () => <ClaimedState />)
          .with('ineligible', () => <IneligibleState />)
          .with('not_activated', () => <NotActivatedState />)
          .exhaustive()}
      </div>
    </Modal>
  );
}

function ActivatedState() {
  return (
    <>
      <Text color="gray-500">
        Great news -- you're activated and eligible to claim your FREE swag
        pack! 🎉
      </Text>

      <Button.Group>
        <Link
          className={getButtonCn({ variant: 'primary' })}
          to={Route['/home/claim-swag-pack']}
        >
          Claim Swag Pack
        </Link>
      </Button.Group>
    </>
  );
}

function ClaimedState() {
  const { activatedAt, claimedSwagPackAt } = useLoaderData<typeof loader>();

  const activationDate = <span className="font-semibold">{activatedAt}</span>;

  const claimedDate = (
    <span className="font-semibold">{claimedSwagPackAt}</span>
  );

  const merchLink = (
    <Link className="link" target="_blank" to="https://colorstackmerch.org">
      ColorStack Merch Store
    </Link>
  );

  return (
    <Text color="gray-500">
      You were activated on {activationDate} and claimed your swag pack on{' '}
      {claimedDate}! Check out the official {merchLink} to purchase more swag!
      👕
    </Text>
  );
}

function IneligibleState() {
  const { acceptedAt } = useLoaderData<typeof loader>();

  const acceptedDate = <span className="font-semibold">{acceptedAt}</span>;

  return (
    <Text color="gray-500">
      ColorStack launched the activation flow for members who joined after June
      9th, 2023. You joined on {acceptedDate}, so unfortunately the activation
      flow does not apply to you and you are not eligible to claim a swag pack.
      😢
    </Text>
  );
}

function NotActivatedState() {
  const { requirementsCompleted } = useLoaderData<typeof loader>();

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
    <>
      <Text color="gray-500">
        You've completed {requirementsCompleted.length}/6 activation
        requirements. Once you hit all 6, you will be eligible to claim your
        FREE swag pack! 👀
      </Text>

      <ul className="flex flex-col">
        <ActivationItem
          label="Attend a Fam Friday Event"
          requirement="attend_event"
        >
          <ActivationItem.Description>
            We host a monthly virtual event at the end of every month called Fam
            Friday. Stay tuned to the {upcomingEventsLink} page -- we typically
            open registration around the 3rd week of every month!{' '}
          </ActivationItem.Description>

          <ActivationItem.QuestionList>
            <ActivationItem.Question
              answer="No, you just have to attend a minimum of 2 sessions!"
              question="Do I have to attend all the sessions in the event?"
            />
            <ActivationItem.Question
              answer="Event attendance is updated within 2 hours of the event ending."
              question="How long does it take for my attendance to be updated?"
            />
            <ActivationItem.Question
              answer={
                <>
                  It is likely that you joined the event with an email address
                  that is not on your ColorStack account. Please add that email
                  to your account {emailLink}, then it should update!
                </>
              }
              question="I waited 2 hours, but my attendance hasn't been updated. What should I do?"
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
              answer="Please allow our team 48 hours to mark your attendance."
              question="I attended an onboarding session, but my attendance hasn't been updated."
            />
          </ActivationItem.QuestionList>
        </ActivationItem>

        <ActivationItem
          label="Open a Weekly Newsletter"
          requirement="open_email_campaign"
        >
          <ActivationItem.Description>
            You are automatically subscribed to our weekly newsletter -- new
            issues are typically sent on Wednesdays. If you haven't received a
            newsletter after 2 weeks of being in ColorStack, let us know.
          </ActivationItem.Description>

          <ActivationItem.QuestionList>
            <ActivationItem.Question
              answer='You will receive the newsletter issues in your email inbox. The subject typically starts with "[ColorStack Newsletter]".'
              question="Where can I find the newsletters?"
            />
            <ActivationItem.Question
              answer='Please allow up to 48 hours for our system to register you opening a newsletter. Sometimes Mailchimp does not register opens, so you can guarantee it registers by clicking the button at the bottom of the email that says "Click Here for Activation Checkmark".'
              question="I opened the newsletter, but it has not been marked as opened."
            />
          </ActivationItem.QuestionList>
        </ActivationItem>

        <ActivationItem
          label={
            <>
              Introduce Yourself in{' '}
              <Link
                className="link"
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
            This is an easy one -- please follow the template others have used
            in the #introductions channel!
          </ActivationItem.Description>
        </ActivationItem>

        <ActivationItem
          label={
            <>
              Answer a QOTD in{' '}
              <Link
                className="link"
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
            We post announcements typically 2x a week. Look out for a question
            of the day (QOTD) and answer it in the thread!
          </ActivationItem.Description>

          <ActivationItem.QuestionList>
            <ActivationItem.Question
              answer="It is likely that you are trying to post a message in the channel directly, which you are not allowed to do. You have to open the thread of the announcement and reply there."
              question="Slack is not letting me reply. What should I do?"
            />
          </ActivationItem.QuestionList>
        </ActivationItem>

        <ActivationItem
          label="Reply to 2 Other Threads"
          requirement="reply_to_other_messages"
        >
          <ActivationItem.Description>
            We highly value engagement and helping others in the community!
            Reply to 2 threads that other ColorStack members have posted.
          </ActivationItem.Description>
        </ActivationItem>
      </ul>
    </>
  );
}

// Activation Item

type ActivationItemProps = PropsWithChildren<{
  label?: React.ReactNode;
  requirement: ActivationRequirement;
}>;

const ActivationItem = ({
  children,
  label,
  requirement,
}: ActivationItemProps) => {
  const [expanded, setExpanded] = useState(false);

  const { requirementsCompleted } = useLoaderData<typeof loader>();

  const completed = requirementsCompleted.includes(requirement);

  return (
    <li>
      <button
        className="group flex w-full cursor-pointer items-start gap-2 py-2"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <div className="mt-0.5">
          {completed ? <CheckCircle color="green" /> : <XCircle color="red" />}
        </div>

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

          <div className="flex flex-col gap-2">{children}</div>
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
    <li className="flex flex-col gap-1">
      <Text weight="500" variant="sm">
        {question}
      </Text>

      <Text color="gray-500" variant="sm">
        {answer}
      </Text>
    </li>
  );
};

ActivationItem.QuestionList = function QuestionList({
  children,
}: PropsWithChildren) {
  return (
    <>
      <Divider my="1" />
      <ul className="flex flex-col gap-2">{children}</ul>
    </>
  );
};

ActivationItem.Title = function Title({ children }: PropsWithChildren) {
  return <Text weight="500">{children}</Text>;
};
