import dedent from 'dedent';

import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';
import {
  createEmbedding,
  getChatCompletion,
  rerankDocuments,
} from '@/modules/ai/ai';
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

  const questionResult = await isQuestion(text);

  if (!questionResult.ok) {
    throw new Error(questionResult.error);
  }

  if (!questionResult.ok || !questionResult.data) {
    job('notification.slack.send', {
      channel: channelId,
      message:
        'I apologize, but I can only answer questions. Is there something ' +
        "specific you'd like to ask?",
      threadId: id,
      workspace: 'regular',
    });

    return;
  }

  job('notification.slack.send', {
    channel: channelId,
    message: 'Searching our Slack history...',
    threadId: id,
    workspace: 'regular',
  });

  const answerResult = await getAnswerFromSlackHistory(text);

  if (!answerResult.ok) {
    throw new Error(answerResult.error);
  }

  // Remove all <thread></thread> references and replace them with an actual
  // Slack message link.
  const answerWithLinks = answerResult.data.replace(
    /<thread>(.*?):(.*?):(.*?)<\/thread>/g,
    `<https://colorstack-family.slack.com/archives/$1/p$2|*[$3]*>`
  );

  job('notification.slack.send', {
    channel: channelId,
    message: answerWithLinks,
    threadId: id,
    workspace: 'regular',
  });

  // TODO: Delete the loading message after the answer is sent.
}

/**
 * Determines if the given text is a question.
 *
 * @param question - The text to determine if it's a question.
 * @returns Whether the text is a question.
 */
async function isQuestion(question: string): Promise<Result<boolean>> {
  const result = await getChatCompletion({
    maxTokens: 5,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: `Input: ${question}` }],
      },
    ],
    system: [
      {
        cache: true,
        type: 'text',
        text: dedent`
          Your only job is to determine if the user's question is a question.
          If it is, respond with "true". If it is not, respond with "false".
        `,
      },
    ],
    temperature: 0,
  });

  if (!result.ok) {
    return fail(result);
  }

  return success(result.data === 'true');
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
    topK: 50,
    vector: embeddingResult.data,
  });

  const messages = await Promise.all(
    matches.map(async (match) => {
      const [thread, replies] = await Promise.all([
        db
          .selectFrom('slackMessages')
          .select(['channelId', 'createdAt', 'text'])
          .where('id', '=', match.id)
          .executeTakeFirst(),

        db
          .selectFrom('slackMessages')
          .select(['text'])
          .where('threadId', '=', match.id)
          .orderBy('createdAt', 'asc')
          .limit(50)
          .execute(),
      ]);

      const formattedReplies = replies
        .map((message) => message.text)
        .join('\n');

      return {
        channelId: thread?.channelId,
        createdAt: thread?.createdAt.toISOString(),
        question: thread?.text || '',
        replies: formattedReplies,
        threadId: match.id,
      };
    })
  );

  const documents = messages.map((message) => {
    return message.createdAt + '\n' + message.question + '\n' + message.replies;
  });

  const rankingsResult = await rerankDocuments(question, documents, {
    topK: 5,
  });

  if (!rankingsResult.ok) {
    return fail(rankingsResult);
  }

  const rerankedMessages = rankingsResult.data.map((document) => {
    const message = messages[document.index];

    const parts = [];

    if (message.createdAt) {
      parts.push(`[Relevance Score]: ${document.relevance_score}`);
    }

    if (message.createdAt) {
      parts.push(`[Timestamp]: ${message.createdAt}`);
    }

    if (message.channelId) {
      parts.push(`[Channel ID]: ${message.channelId}`);
    }

    if (message.threadId) {
      parts.push(`[Thread ID]: ${message.threadId}`);
    }

    if (message.question) {
      parts.push(`[Message]: ${message.question}`);
    }

    if (message.replies) {
      parts.push(`[Replies]: ${message.replies}`);
    }

    return parts.join('\n');
  });

  const completionResult = await getChatCompletion({
    maxTokens: 1000,
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
              ${rerankedMessages.join('\n\n')}
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
          set of threads that MAY OR MAY NOT contain the answer to the question.
          If there are no threads given, that means the question was not found
          in the Slack history.

          Do your best to answer the question based on the threads. If you can't
          find the answer in the threads or are not confident, please respond
          that you don't know the answer. If the question is extremeley vague,
          don't try to answer it using the threads. If you can't answer the
          question, do NOT mention any threads that you were given.

          If you find something helpful in a thread, be sure to include a
          reference by doing <thread>channel_id:thread_id:thread_number</thread>,
          where thread_number is an autoincrementing number starting at 1. The
          same thread_id should always have the same thread_number. These
          threads will be formatted as links (with the display text
          "<thread_number>", so put them AFTER the sentence that uses that
          reference.

          You should factor in the score AND the date of the thread when
          answering the question. If a thread is very old, you should be less
          confident in it's contents, unless you don't think time is super
          relevant to the answer.

          Other rules for responding:
          - Be kind.
          - Be concise.
          - Use numbers or bullet points to organize thoughts where appropriate.
          - Reference numbers should always be after the terminal punctuation
            with a space in between. If you're using it in a bullet/number list,
            put the reference number directly after the point.
          - Never use phrases like "Based on the provided Slack threads...".
            Just get to the answer and link the threads wherever they're used.
          - If the question is not actually a question, respond that you can
            only answer questions, and that's not a question.

          The higher the relevance score, the more confident you should be in
          your answer (ie: > 0.9). If the relevance score is low (ie: < 0.5),
          you should be less confident in your answer.
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
