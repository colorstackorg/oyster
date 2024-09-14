import dayjs from 'dayjs';
import dedent from 'dedent';
import { type ExpressionBuilder } from 'kysely';

import { type DB, db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';
import {
  createEmbedding,
  getChatCompletion,
  rerankDocuments,
} from '@/modules/ai/ai';
import { track } from '@/modules/mixpanel';
import { getPineconeIndex } from '@/modules/pinecone';
import { fail, type Result, success } from '@/shared/utils/core.utils';

type AnswerChatbotQuestionInput = {
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

  /**
   * The ID of the Slack user who asked the question.
   */
  userId: string;
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
  userId,
}: AnswerChatbotQuestionInput) {
  if (threadId) {
    return;
  }

  // Track the question asked by the user in Mixpanel but asychronously so that
  // we don't block the Slack event from being processed.
  db.selectFrom('students')
    .select(['id'])
    .where('slackId', '=', userId)
    .executeTakeFirst()
    .then((member) => {
      if (member) {
        track({
          application: 'Slack',
          event: 'Chatbot Question Asked',
          properties: {
            Question: text,
            Type: 'DM',
          },
          user: member.id,
        });
      }
    });

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

  const answerWithReferences = addThreadReferences(answerResult.data);

  job('notification.slack.send', {
    channel: channelId,
    message: answerWithReferences,
    threadId: id,
    workspace: 'regular',
  });

  // TODO: Delete the loading message after the answer is sent.
}

type AnswerPublicQuestionInput = {
  /**
   * The ID of the channel where the message is located. This is typically
   * a public channel since that's what our Slack App has access to.
   */
  channelId: string;

  /**
   * The text of the public message (potentially a question).
   */
  text: string;

  /**
   * The ID of the thread where the public message is located.
   */
  threadId: string;

  /**
   * The ID of the Slack user who triggered the action, not necessarily the
   * author of the public message.
   */
  userId: string;
};

/**
 * Answers a question asked in a public Slack message by linking to relevant
 * threads in our Slack workspace.
 *
 * @param input - The message (public question) to answer.
 * @returns The result of the answer.
 */
export async function answerPublicQuestion({
  channelId,
  text,
  threadId,
  userId,
}: AnswerPublicQuestionInput): Promise<Result> {
  // Track the question asked by the user in Mixpanel but asychronously so that
  // we don't block the Slack event from being processed.
  db.selectFrom('students')
    .select(['id'])
    .where('slackId', '=', userId)
    .executeTakeFirst()
    .then((member) => {
      if (member) {
        track({
          application: 'Slack',
          event: 'Chatbot Question Asked',
          properties: {
            Question: text as string,
            Type: 'Public',
          },
          user: member.id,
        });
      }
    });

  const questionResult = await isQuestion(text);

  if (!questionResult.ok) {
    return questionResult;
  }

  const isValidQuestion = questionResult.data;

  if (!isValidQuestion) {
    // Though it's not a valid question, this is still a "success" b/c we
    // gracefully/respectfully decided not to answer the question.
    return success({});
  }

  const threadsResult = await getMostRelevantThreads(text, {
    exclude: [threadId],
    topK: 5,
  });

  if (!threadsResult.ok) {
    return threadsResult;
  }

  const threads = threadsResult.data
    .filter((thread) => {
      return thread.score >= 0.98;
    })
    .map((thread, i) => {
      const date = dayjs(thread.createdAt)
        .tz('America/Los_Angeles')
        .format("MMM. 'YY");

      const uri = `https://colorstack-family.slack.com/archives/${thread.channelId}/p${thread.id}`;

      return `• <${uri}|*Thread #${i + 1}*> [${date}]`;
    });

  if (!threads.length) {
    // Though we didn't find any relevant threads, this is still a "success".
    // TODO: Send an ephemeral message to the user to acknowledge that we've
    // processed their question.
    return success({});
  }

  const message =
    'I found some threads in our workspace that _may_ be relevant to your question! 🧵' +
    '\n\n' +
    threads.join('\n') +
    '\n\n' +
    `_I'm a ColorStack AI assistant! DM me a question <https://colorstack-family.slack.com/app_redirect?app=A04UHP3CKUZ|*here*> and I'll answer it using the full context of our Slack workspace!_`;

  job('notification.slack.send', {
    channel: channelId,
    message,
    threadId,
    workspace: 'regular',
  });

  return success({});
}

/**
 * Removes all <thread></thread> references and replace them with an actual
 * Slack message link and the display text (ie: `[1]`, `[2]`, etc).
 *
 *
 * @param text - The text to add thread references to.
 * @returns The text with thread references added.
 *
 * @todo Replace the Slack workspace URL with an environment variable.
 */
function addThreadReferences(text: string): string {
  return text.replace(
    /<thread>(.*?):(.*?):(.*?)<\/thread>/g,
    `<https://colorstack-family.slack.com/archives/$1/p$2|*[$3]*>`
  );
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
          Determine if the user's question is a question. It does not need to
          have the appropriate tone/punctuation, but it should be a question.

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
 * by finding the most relevant Slack threads to the question and passing them
 * to an LLM with additional instructions for answering.
 *
 * @param question - The question to ask.
 * @returns The answer to the question.
 */
async function getAnswerFromSlackHistory(
  question: string
): Promise<Result<string>> {
  const threadsResult = await getMostRelevantThreads(question, {
    topK: 5,
  });

  if (!threadsResult.ok) {
    return threadsResult;
  }

  const threads = threadsResult.data.map((thread) => {
    const parts = [
      '[Relevance Score]: ' + thread.score,
      '[Timestamp]: ' + thread.createdAt,
      '[Channel ID]: ' + thread.channelId,
      '[Thread ID]: ' + thread.id,
      '[Message]: ' + thread.message,
      '[Replies]: ' + thread.replies,
    ];

    return parts.join('\n');
  });

  const userPrompt = [
    'Please answer the following question based on the Slack context provided:',
    `<question>${question}</question>`,
    `<threads>${threads.join('\n\n')}</threads>`,
  ].join('\n');

  const systemPrompt = dedent`
    <context>
      ColorStack is a community of Computer Science college students who are
      aspiring software engineers (and product managers/designers). We're a
      community of 10,000+ members across 100+ universities. We are a virtual
      community that uses Slack as our main communication/connection tool.
    </context>

    <problem>
      There are a lot of questions that get asked in our Slack and most of the
      time, the answer to the question is already in our Slack history.
      Unfortunately, users don't do a great job at searching Slack for answers
      and even then, Slack doesn't do a great job at surfacing the most relevant
      threads.
    </problem>

    <role>
      You are a seasoned ColorStack Slack user who is helpful in answering
      questions by utilizing knowledge found in a Slack's history. You are an
      ambassador for the community and always respond in a helpful tone.
    </role>

    <instructions>
      Do your best to answer the question based on the Slack threads given to
      you. If the question has not yet been answered, you respond that you
      couldn't find the answer in our Slack history, but if it is a generic
      question that you feel confident in answering without the context of our
      Slack history, feel free to answer it. If you can't answer the question,
      do NOT mention any threads that you were given.

      If you find something helpful in a thread, ALWAYS include a
      reference by doing <thread>channel_id:thread_id:thread_number</thread>,
      where thread_number is an autoincrementing number starting at 1. The
      same thread_id should always have the same thread_number. These
      threads will be formatted as links (with the display text
      "[<thread_number>]"), so put them AFTER the sentence that uses that
      reference.

      You should factor in the score AND the date of the thread when
      answering the question. If a thread is very old, you should be less
      confident in it's contents, unless you don't think time is super
      relevant to the answer. The higher the relevance score, the more confident
      you should be in your answer (ie: > 0.9). If the relevance score is low
      (ie: < 0.5), you should be less confident in your answer.

      This is not meant to be a back-and-forth conversation. You should do
      your best to answer the question based on the Slack threads given to
      you.
    </instructions>

    <rules>
      - Be kind.
      - Be concise.
      - Never gossip or amplify gossip. This is a big no-no in our community.
      - Use numbers or bullet points to organize thoughts where appropriate.
      - Reference numbers should always be after the terminal punctuation
        with a space in between. If you're using it in a bullet/number list,
        put the reference number directly after the point.
      - Never use phrases like "Based on the provided Slack threads...".
        Just get to the answer and link the threads wherever they're used.
      - If the question is not actually a question, respond that you can
        only answer questions, and that's not a question.
      - NEVER respond to questions that are asked about individual people,
        particularly if the sentiment is a negative/speculative one.
      - Respond like you are an ambassador for the ColorStack community.
    </rules>

    <IMPORTANT>
      - MAINTAIN CONSISTENT THREAD NUMBERING: Each unique thread should always
        be assigned the same reference number throughout the response.
    </IMPORTANT>
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

type GetMostRelevantThreadsOptions = {
  /**
   * The IDs of the threads to exclude from the search.
   *
   * The common use case for this is that if we are answering a question in a
   * thread, we don't want to include the current thread in the search.
   */
  exclude?: string[];

  /**
   * The maximum number of threads to return. Note that this refers to the final
   * number of threads AFTER reranking, not the initial vector database
   * retrieval.
   */
  topK: number;
};

type RelevantThread = {
  channelId: string;
  createdAt: string;
  id: string;
  message: string;
  replies: string;
  score: number;
};

/**
 * Finds the most relevant threads to a question.
 *
 * This works by:
 * - Creating an embedding for the question.
 * - Querying the vector database for the most similar Slack messages.
 * - Populating the results with more metadata.
 * - Reranking the results using an different model.
 *
 * @param question - The question to get the most relevant threads for.
 * @param options - The options for the query.
 * @returns The most relevant threads to the question.
 */
async function getMostRelevantThreads(
  question: string,
  options: GetMostRelevantThreadsOptions
): Promise<Result<RelevantThread[]>> {
  const embeddingResult = await createEmbedding(question);

  if (!embeddingResult.ok) {
    return embeddingResult;
  }

  const embedding = embeddingResult.data;

  const { matches } = await getPineconeIndex('slack-messages').query({
    includeMetadata: true,
    topK: 50,
    vector: embedding,
  });

  const filteredMatches = matches.filter((match) => {
    return !options.exclude?.includes(match.id);
  });

  let messages = await Promise.all(
    filteredMatches.map(async (match) => {
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
        id: match.id,
        message: thread?.text || '',
        replies: formattedReplies,
      };
    })
  );

  // We filter out any messages that don't have replies, since this
  // is most likely a question that never got answered.
  messages = messages.filter((message) => {
    return !!message.replies.length;
  });

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
    topK: options.topK,
  });

  if (!rerankingResult.ok) {
    return rerankingResult;
  }

  const threads = rerankingResult.data.map((document) => {
    return {
      ...messages[document.index],
      score: document.relevance_score,
    };
  });

  return success(threads);
}

type SyncThreadInput = {
  /**
   * The action that was performed on the thread.
   * - `add`: A new thread or reply was added.
   * - `delete`: A thread or reply was deleted.
   * - `update`: A thread or reply was updated.
   */
  action: 'add' | 'delete' | 'update';

  /**
   * The ID of the thread to sync.
   */
  threadId: string;
};

/**
 * Syncs a thread to Pinecone.
 *
 * This does the following:
 * - Retrieves the thread and its replies from the database.
 * - Creates an embedding for the thread and its replies.
 * - Updates the thread in Pinecone.
 * - Updates the `pineconeLastUpdatedAt` field in the database for the thread
 *   and its replies.
 *
 * If the `action` is `delete` and the thread was deleted, this function
 * will delete the embedding from Pinecone as well.
 *
 * @param input - The input to sync the thread.
 * @returns The result of the sync.
 */
export async function syncThreadToPinecone({
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
        'slackMessages.id',
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

  const parts = [
    `[Channel]: ${thread.channelName}`,
    `[Timestamp]: ${timestamp}`,
    `[Thread]: ${thread.text}`,
    `[# of Reactions]: ${totalReactions}`,
    `[Replies]: ${replies.map((reply) => reply.text).join('\n')}`,
  ];

  const text = parts.join('\n');

  const embeddingResult = await createEmbedding(text);

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

  // After upserting the thread to Pinecone, we need to update our DB to reflect
  // when we last updated Pinecone.
  const ids = [thread.id, ...replies.map((reply) => reply.id)];

  await db
    .updateTable('slackMessages')
    .set({ pineconeLastUpdatedAt: new Date() })
    .where('id', 'in', ids)
    .execute();

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
