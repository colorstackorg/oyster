import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from '@remix-run/react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
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
import { IconButton, ProfilePicture, Text, useEventSource } from '@oyster/ui';

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

const QuestionContext = createContext<{
  question: string;
  setQuestion: (question: string) => void;
}>({
  question: '',
  setQuestion: () => {},
});

export default function AskAI() {
  const [question, setQuestion] = useState('');

  return (
    <QuestionContext.Provider value={{ question, setQuestion }}>
      <section
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 data-[submitted='false']:justify-center"
        // data-submitted={hasSubmitted}
      >
        <ChatbotHeader />
        <ChatbotForm />

        <div className="min-h-60">
          <ChatbotAnswer />
          {/* {state === 'submitting' ? <LoadingState /> : <ChatbotResponse />} */}
        </div>
      </section>
    </QuestionContext.Provider>
  );
}

function ChatbotAnswer() {
  const { question } = useContext(QuestionContext);

  const a = useEventSource<string>(
    '/ask-ai-test/stream' + `?question=${question}`,
    {
      enabled: !!question,
      event: 'data',
    }
  );

  let formatted = '';

  if (a) {
    try {
      formatted = JSON.parse(a);
    } catch (e) {
      console.error(e);
    }
  }

  return <Text className="whitespace-pre-wrap">{formatted}</Text>;
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

function ChatbotForm() {
  const { setQuestion } = useContext(QuestionContext);

  const questionRef = useRef<HTMLInputElement>(null);

  return (
    <Form
      action="/ask-ai-test/stream"
      className="flex flex-col gap-4"
      method="get"
      navigate={false}
      onSubmit={() => {
        console.log('SUBMIT', questionRef.current!.value);
        setQuestion(questionRef.current!.value);
      }}
    >
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
          ref={questionRef}
          required
          type="text"
        />

        <div className="ml-auto flex items-center gap-2">
          <IconButton
            backgroundColor="gray-100"
            backgroundColorOnHover="gray-200"
            // disabled={isSubmitting}
            icon={<X size={20} />}
            onClick={() => {
              questionRef.current!.value = '';
            }}
            shape="square"
          />
          <IconButton
            backgroundColor="gray-100"
            backgroundColorOnHover="gray-200"
            // disabled={isSubmitting}
            icon={<Send size={20} />}
            shape="square"
            type="submit"
          />
        </div>
      </div>
    </Form>
  );
}
