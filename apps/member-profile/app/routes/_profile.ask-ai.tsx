import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useNavigation,
} from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import {
  AlignLeft,
  ArrowUpRight,
  ExternalLink,
  MessageCircle,
  Send,
  X,
} from 'react-feather';
import { match } from 'ts-pattern';

import {
  answerMemberProfileQuestion,
  type ParsedChatbotAnswer,
  type ThreadReference,
} from '@oyster/core/slack';
import { IconButton, ProfilePicture, Text } from '@oyster/ui';

import { cache } from '@/infrastructure/redis';
import { EmptyState } from '@/shared/components/empty-state';
import { SlackMessage } from '@/shared/components/slack-message';
import {
  commitSession,
  ensureUserAuthenticated,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const answer = await cache.get<ParsedChatbotAnswer>(
    'chatbotAnswer:' + user(session)
  );

  return json({ answer });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const question = form.get('question') as string;

  if (!question || !question.trim()) {
    return json(
      { error: 'Please provide a valid question.', ok: false as const },
      { status: 400 }
    );
  }

  const result = await answerMemberProfileQuestion({
    memberId: user(session),
    question: question.trim(),
  });

  if (!result.ok) {
    return json(
      { error: result.error, ok: false as const },
      { status: result.code }
    );
  }

  return json(
    {
      answerSegments: result.data.answerSegments,
      ok: true as const,
      threads: result.data.threads,
    },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

export default function AskAI() {
  const { state } = useNavigation();
  const actionData = useActionData<typeof action>();
  const { answer } = useLoaderData<typeof loader>();

  const hasSubmitted = state === 'submitting' || !!answer || !!actionData;

  return (
    <section
      className='mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 data-[submitted="false"]:justify-center'
      data-submitted={hasSubmitted}
    >
      <ChatbotHeader />
      <ChatbotForm />

      <div className="min-h-60">
        {state === 'submitting' ? <LoadingState /> : <ChatbotResponse />}
      </div>
    </section>
  );
}

function ChatbotHeader() {
  return (
    <header className="flex flex-col items-center gap-1">
      <EmptyState icon={<MessageCircle />} />

      <Text variant="3xl" weight="500">
        What do you want to know?
      </Text>

      <Text color="gray-500" weight="400">
        Ask a question and I'll answer it using our Slack workspace history!
      </Text>
    </header>
  );
}

const EXAMPLE_QUESTIONS = [
  'Has anybody taken the Microsoft OA?',
  'What is Fam Friday?',
  'What resources do you recommend for preparing for a technical interview?',
  'Do you have any advice on negotiating a salary?',
  'What is the IRL StackedUp Summit?',
  "I'm a bit worried about my Computer Science courses. Any advice?",
  'How should I prepare for a behavioral interview?',
];

function ChatbotForm() {
  const navigation = useNavigation();
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const questionRef = useRef<HTMLInputElement>(null);

  const isSubmitting = navigation.state === 'submitting';

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((value) => {
        return (value + 1) % EXAMPLE_QUESTIONS.length;
      });
    }, 2500);

    return () => {
      return clearInterval(interval);
    };
  }, []);

  function onClickSuggestion(e: React.MouseEvent<HTMLButtonElement>) {
    questionRef.current!.value = e.currentTarget.value;
  }

  return (
    <RemixForm className="flex flex-col gap-4" method="post">
      <div
        // This is the "input" styling...really should be getting it from
        // the input component, but this is a quick fix.
        className="flex flex-col gap-4 rounded-lg border border-gray-200 p-2 focus-within:border-primary focus:border-primary"
        onClick={(e) => {
          // Only need to do something when the click's target is on the actual
          // <div />, not any of the children.
          if (e.currentTarget === e.target) {
            questionRef.current!.focus();
          }
        }}
      >
        <input
          // TODO: Convert this to an autosize <textarea />.
          autoComplete="off"
          autoFocus
          className="w-full text-base"
          name="question"
          placeholder={EXAMPLE_QUESTIONS[placeholderIndex]}
          ref={questionRef}
          required
          type="text"
        />

        <div className="ml-auto flex items-center gap-2">
          <IconButton
            backgroundColor="gray-100"
            backgroundColorOnHover="gray-200"
            disabled={isSubmitting}
            icon={<X size={20} />}
            onClick={() => {
              questionRef.current!.value = '';
            }}
            shape="square"
          />
          <IconButton
            backgroundColor="gray-100"
            backgroundColorOnHover="gray-200"
            disabled={isSubmitting}
            icon={<Send size={20} />}
            shape="square"
            type="submit"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-auto pb-4">
        <SuggestedQuestion
          disabled={isSubmitting}
          question="What is Fam Friday?"
          onClick={onClickSuggestion}
        />
        <SuggestedQuestion
          disabled={isSubmitting}
          question="What is the IRL StackedUp Summit?"
          onClick={onClickSuggestion}
        />
        <SuggestedQuestion
          disabled={isSubmitting}
          question="How should I prepare for a technical interview?"
          onClick={onClickSuggestion}
        />
      </div>
    </RemixForm>
  );
}

type SuggestedQuestionProps = {
  disabled: boolean;
  question: string;
  onClick(e: React.MouseEvent<HTMLButtonElement>): void;
};

function SuggestedQuestion({
  disabled,
  question,
  onClick,
}: SuggestedQuestionProps) {
  return (
    <button
      className="flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1 text-xs hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      name="question"
      onClick={onClick}
      type="submit"
      value={question}
    >
      {question}
      <ArrowUpRight size={14} />
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-2">
      {[...Array(10)].map((_, i) => {
        return (
          <div
            className="h-4 w-full animate-[loader-shimmer_1s_ease-in-out_infinite] rounded-full bg-gray-200 opacity-20"
            key={i}
            style={{ animationDelay: `${i * 100}ms` }}
          />
        );
      })}
    </div>
  );
}

function ChatbotResponse() {
  const actionData = useActionData<typeof action>();
  const { answer } = useLoaderData<typeof loader>();

  if (!actionData && !answer) {
    return null;
  }

  if (actionData && !actionData.ok) {
    return <Text color="error">{actionData.error}</Text>;
  }

  const { answerSegments, threads } = (actionData || answer)!;

  return (
    <div className="flex flex-col gap-8">
      <ResponseSection icon={<ExternalLink />} title="Sources">
        <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-4">
          {threads.map((thread) => {
            return <ThreadPreview key={thread.number} {...thread} />;
          })}
        </ul>
      </ResponseSection>

      <ResponseSection icon={<AlignLeft />} title="Answer">
        <Text className="whitespace-break-spaces">
          {answerSegments.map((segment, i) => {
            return match(segment)
              .with({ type: 'text' }, ({ content }) => {
                return content;
              })
              .with({ type: 'reference' }, ({ number }) => {
                const thread = threads.find((thread) => {
                  return thread.number === number;
                });

                // This should never happen, but keeping this check just to be safe.
                if (!thread) {
                  return null;
                }

                return (
                  <ReferenceLink
                    key={i}
                    number={thread.number}
                    url={thread.url}
                  />
                );
              })
              .exhaustive();
          })}
        </Text>
      </ResponseSection>
    </div>
  );
}

function ThreadPreview({
  authorFirstName,
  authorLastName,
  authorProfilePicture,
  createdAt,
  number,
  replyCount,
  text,
  url,
}: ThreadReference) {
  return (
    <li className="w-64 shrink-0 snap-start">
      <button
        className="flex h-full w-full flex-col gap-3 rounded-lg bg-gray-50 p-1 hover:bg-gray-100"
        onClick={(e) => {
          // We would obviously prefer to use a link here, but since we may have
          // nested links within the Slack message, we have to adjust this
          // top level component to be a button.
          window.open(e.currentTarget.value, '_blank');
        }}
        type="button"
        value={url}
      >
        <div className="flex w-full items-center gap-1">
          <ProfilePicture
            initials={(authorFirstName[0] || '') + (authorLastName[0] || '')}
            size="32"
            src={authorProfilePicture}
          />

          <Text className="line-clamp-1" weight="600" variant="sm">
            {authorFirstName} {authorLastName}
          </Text>

          <Text className="ml-auto" color="gray-500" variant="xs">
            {createdAt}
          </Text>
        </div>

        <SlackMessage
          as="span"
          className="line-clamp-3"
          color="gray-500"
          variant="sm"
        >
          {text}
        </SlackMessage>

        <div className="mt-auto flex w-full items-center justify-between gap-2">
          <Text color="gray-500" variant="xs">
            {replyCount} replies
          </Text>

          <ReferenceLink number={number} url={url} />
        </div>
      </button>
    </li>
  );
}

type ReferenceLinkProps = {
  number: number;
  url: string;
};

function ReferenceLink({ number, url }: ReferenceLinkProps) {
  return (
    <a
      className="mr-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-sm text-primary hover:bg-primary hover:text-white"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
    >
      {number}
    </a>
  );
}

// Helpers

type ResponseSectionProps = {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
};

function ResponseSection({ children, icon, title }: ResponseSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {icon}

        <Text weight="500" variant="lg">
          {title}
        </Text>
      </div>

      {children}
    </section>
  );
}
