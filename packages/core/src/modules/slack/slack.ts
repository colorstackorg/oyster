import dedent from 'dedent';

import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';
import { createEmbedding, getChatCompletion } from '@/modules/ai/ai';
import { getPineconeIndex } from '@/modules/pinecone';
import { fail, type Result, success } from '@/shared/utils/core.utils';

type RespondToBotQuestionInput = {
  /**
   * The ID of the channel where the message was sent. This should be the
   * DM channel between the bot and the user.
   */
  channelId: string;

  id: string;

  text: string;

  /**
   * The ID of the thread where the message was sent, if present. Note that
   * we don't support replying to threads yet.
   */
  threadId?: string;
};

/**
 * Answers the question asked by the user in its channel w/ the ColorStack bot.
 * The uses the underlying `getAnswerFromSlackHistory` function to answer the
 * question, and then sends the answer in the thread where the question was
 * asked.
 *
 * @param input - The question (ie: `text`) to respond to.
 */
export async function answerChatbotQuestion({
  channelId,
  id,
  text,
  threadId,
}: RespondToBotQuestionInput) {
  if (threadId) {
    return;
  }

  const answerResult = await getAnswerFromSlackHistory(text);

  if (!answerResult.ok) {
    console.error(answerResult.error);

    return;
  }

  // Remove all <thread></thread> references and replace them with an actual
  // Slack message link.
  const answerWithLinks = answerResult.data.replace(
    /<thread>(.*?):(.*?)<\/thread>/g,
    `<https://colorstack-family.slack.com/archives/$1/p$2|thread>`
  );

  job('notification.slack.send', {
    channel: channelId,
    message: answerWithLinks,
    threadId: id,
    workspace: 'regular',
  });
}

/**
 * Ask a question to the Slack workspace.
 *
 * This is a RAG (Retrieval Augmented Generation) implementation that works
 * as follows:
 * - Create an embedding for the question.
 * - Query the vector database for the most similar Slack messages.
 * - Pass the most similar Slack threads found to an LLM.
 * - Return the answer.
 *
 * @param question - The question to ask.
 * @returns The answer to the question.
 */
async function getAnswerFromSlackHistory(
  question: string
): Promise<Result<string>> {
  const embeddingResult = await createEmbedding(question);

  if (!embeddingResult.ok) {
    return fail({
      code: embeddingResult.code,
      error: embeddingResult.error,
    });
  }

  const { matches } = await getPineconeIndex('slack-messages').query({
    includeMetadata: true,
    topK: 3,
    vector: embeddingResult.data,
  });

  const messages = await Promise.all(
    matches
      .filter((match) => match.score && match.score >= 0.5)
      .map(async (match) => {
        const threadId = match.metadata?.threadId || match.id;

        const [thread, replies] = await Promise.all([
          db
            .selectFrom('slackMessages')
            .select(['channelId', 'text'])
            .where('id', '=', threadId)
            .executeTakeFirstOrThrow(),

          db
            .selectFrom('slackMessages')
            .select(['text'])
            .where('threadId', '=', threadId)
            .orderBy('createdAt', 'asc')
            .execute(),
        ]);

        const formattedReplies = replies
          .map((message) => message.text)
          .join('\n');

        return {
          channelId: thread.channelId,
          question: thread.text!,
          replies: formattedReplies,
          threadId,
        };
      })
  );

  const stringifiedMessages = JSON.stringify(messages, null, 2);

  const completionResult = await getChatCompletion({
    maxTokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: dedent`
              The question to answer:
              ${question}

              The Slack threads to use are:
              ${stringifiedMessages}
            `,
          },
        ],
      },
    ],
    system: [
      {
        cache: true,
        type: 'text',
        text: dedent`
          You are a helpful assistant that can answer questions by utilizing
          knowledge found in Slack threads. You will be given a question and a
          set of threads that may contain the answer to the question.

          Do your best to answer the question based on the threads. If you can't
          find the answer in the threads or are not confident, please respond
          that you don't know the answer. Don't mention that you are using the
          threads to answer the question.

          If you find something helpful in a thread, be sure to include a
          reference by doing <thread>channel_id:thread_id</thread>.
          These threads will be formatted as links (with the display text
          "thread"), so be sure to take that into account.
        `,
      },
    ],
    temperature: 0,
  });

  if (!completionResult.ok) {
    return fail({
      code: completionResult.code,
      error: completionResult.error,
    });
  }

  return success(completionResult.data);
}
