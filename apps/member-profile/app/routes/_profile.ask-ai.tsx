import { type ActionFunctionArgs, json } from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigation,
} from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Send, X } from 'react-feather';

import { answerMemberProfileQuestion } from '@oyster/core/slack';
import { cx, IconButton, Text } from '@oyster/ui';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const question = formData.get('question') as string;

  const result = await answerMemberProfileQuestion({ question });

  if (!result.ok) {
    return json({ error: result.error, question }, { status: result.code });
  }

  return json({
    answer: result.data,
  });
}

export default function AskAI() {
  const { formData, state } = useNavigation();
  const actionData = useActionData<typeof action>();

  const hasSubmitted = !!actionData || !!formData;

  return (
    <section
      className={cx(
        'mx-auto flex w-full flex-1 flex-col gap-8 @container/ask-ai lg:w-[640px]',
        !hasSubmitted && 'justify-center'
      )}
    >
      <QuestionHeader />
      <QuestionForm />

      <div className="min-h-60">
        {state === 'submitting' ? <LoadingState /> : <QuestionResponse />}
      </div>
    </section>
  );
}

function QuestionHeader() {
  return (
    <header className="flex flex-col items-center gap-1">
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

function QuestionForm() {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const questionRef = useRef<HTMLInputElement>(null);

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
    <RemixForm className="flex w-[inherit] flex-col gap-4" method="post">
      <div
        className="flex flex-col gap-4 rounded-lg border border-gray-200 p-2 focus-within:border-primary focus:border-primary"
        onClick={(e) => {
          // Only focus if the click is on the outer <div />, nothing else.
          if (e.currentTarget === e.target) {
            questionRef.current!.focus();
          }
        }}
      >
        <input
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
            icon={<X size={20} />}
            onClick={() => {
              questionRef.current!.value = '';
            }}
            shape="square"
          />
          <IconButton
            backgroundColor="gray-100"
            backgroundColorOnHover="gray-200"
            icon={<Send size={20} />}
            shape="square"
            type="submit"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-auto pb-4">
        <SuggestedQuestion
          question="What is Fam Friday?"
          onClick={onClickSuggestion}
        />
        <SuggestedQuestion
          question="What is the IRL StackedUp Summit?"
          onClick={onClickSuggestion}
        />
        <SuggestedQuestion
          question="How should I prepare for a technical interview?"
          onClick={onClickSuggestion}
        />
      </div>
    </RemixForm>
  );
}

type SuggestedQuestionProps = {
  question: string;
  onClick(e: React.MouseEvent<HTMLButtonElement>): void;
};

function SuggestedQuestion({ question, onClick }: SuggestedQuestionProps) {
  return (
    <button
      className="flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1 text-xs hover:bg-gray-100 active:bg-gray-200"
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
      {[...Array(5)].map((_, i) => (
        <div
          className="h-4 w-full animate-[loader-shimmer_1.5s_ease-in-out_infinite] rounded-full bg-gray-100"
          key={i}
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
    </div>
  );
}

function QuestionResponse() {
  const actionData = useActionData<typeof action>();

  const answer = actionData && 'answer' in actionData && actionData.answer;
  const error = actionData && 'error' in actionData && actionData.error;

  if (error) {
    return <Text color="error">{error}</Text>;
  }

  if (answer) {
    return <Text>{answer}</Text>;
  }

  return null;
}
