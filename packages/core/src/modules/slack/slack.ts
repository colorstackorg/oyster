import dedent from 'dedent';
import { type ExpressionBuilder } from 'kysely';

import { type DB, db } from '@oyster/db';

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
    return fail(embeddingResult);
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
        channelId: thread?.channelId || '',
        createdAt: thread?.createdAt.toISOString() || '',
        message: thread?.text || '',
        replies: formattedReplies,
        threadId: match.id,
      };
    })
  );

  // This next step is an important one -- we're going to rerank the messages
  // based on their relevance to the question. This helps us get the most
  // relevant threads to the LLM. Reranking models are different from
  // vector search which are optimized for fast retrieval. Reranking models are
  // more accurate at assessing relevance, but they are slower and more
  // expensive to compute.

  const documents = messages.map((message) => {
    return [message.createdAt, message.message, message.replies].join('\n');
  });

  const rerankingResult = await rerankDocuments(question, documents, {
    topK: 5,
  });

  if (!rerankingResult.ok) {
    return fail(rerankingResult);
  }

  const rerankedMessages = rerankingResult.data.map((document) => {
    const message = messages[document.index];

    const parts = [
      '[Relevance Score]: ' + document.relevance_score,
      '[Timestamp]: ' + message.createdAt,
      '[Channel ID]: ' + message.channelId,
      '[Thread ID]: ' + message.threadId,
      '[Message]: ' + message.message,
      '[Replies]: ' + message.replies,
    ];

    return parts.join('\n');
  });

  const userPrompt = [
    `<question>${question}</question>`,
    `<threads>${rerankedMessages.join('\n\n')}</threads>`,
  ].join('\n');

  const systemPrompt = dedent`
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
  `;

  const completionResult = await getChatCompletion({
    maxTokens: 1000,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: userPrompt }],
      },
    ],
    system: [{ cache: true, type: 'text', text: systemPrompt }],
    temperature: 0,
  });

  if (!completionResult.ok) {
    return fail(completionResult);
  }

  return success(completionResult.data);
}

type SyncThreadInput = {
  action: 'add' | 'delete' | 'update';
  threadId: string;
};

export async function syncThreadInPinecone({
  action,
  threadId,
}: SyncThreadInput): Promise<Result> {
  const [thread, replies] = await Promise.all([
    db
      .selectFrom('slackMessages')
      .leftJoin('slackChannels', 'slackChannels.id', 'slackMessages.channelId')
      .select([
        'slackChannels.name as channelName',
        'slackMessages.channelId',
        'slackMessages.createdAt',
        'slackMessages.id',
        'slackMessages.text',
        getReactionsCount,
      ])
      .where('slackMessages.id', '=', threadId)
      .where('slackMessages.text', 'is not', null)
      .where('slackMessages.threadId', 'is', null)
      .executeTakeFirst(),

    db
      .selectFrom('slackMessages')
      .select([
        'slackMessages.text',
        'slackMessages.threadId',
        getReactionsCount,
      ])
      .where('slackMessages.text', 'is not', null)
      .where('slackMessages.threadId', '=', threadId)
      .orderBy('slackMessages.createdAt', 'asc')
      .execute(),
  ]);

  const index = getPineconeIndex('slack-messages');

  if (!thread && action === 'delete') {
    // If the thread doesn't exist in our DB, then it shouldn't exist in
    // Pinecone either. This covers the case when we we call this function
    // after a THREAD has been deleted.
    await index.deleteOne(threadId);

    return success({});
  }

  if (!thread) {
    return fail({
      code: 404,
      error: 'Slack thread not found, skipping Pinecone embedding update.',
    });
  }

  const totalReactions = replies.reduce(
    (result, reply) => {
      return result + Number(reply.reactions || 0);
    },
    Number(thread.reactions || 0)
  );

  const timestamp = thread.createdAt.toISOString();

  const result =
    `[Channel]: ${thread.channelName}\n` +
    `[Timestamp]: ${timestamp}\n` +
    `[Thread]: ${thread.text}\n` +
    `[# of Reactions]: ${totalReactions}\n` +
    `[Replies]: ${replies.map((reply) => reply.text).join('\n')}`;

  const embeddingResult = await createEmbedding(result);

  if (!embeddingResult.ok) {
    return fail(embeddingResult);
  }

  await index.upsert([
    {
      id: thread.id,
      metadata: {
        channelId: thread.channelId,
        sentAt: timestamp,
      },
      values: embeddingResult.data,
    },
  ]);

  return success({});
}

/**
 * Add a `reactions` column to the query, which contains the number of reactions
 * for a message.
 *
 * @param eb - The expression builder.
 * @returns An expression builder with a `reactions` column.
 */
function getReactionsCount(eb: ExpressionBuilder<DB, 'slackMessages'>) {
  return eb
    .selectFrom('slackReactions')
    .select((eb) => eb.fn.countAll<string>().as('count'))
    .where('slackReactions.channelId', '=', 'slackMessages.channelId')
    .where('slackReactions.messageId', '=', 'slackMessages.id')
    .as('reactions');
}
