import { Pinecone } from '@pinecone-database/pinecone';
import dedent from 'dedent';
import OpenAI from 'openai';

import { db } from '@oyster/db';

import { getChatCompletion } from '@/modules/ai/ai.core';
import { fail, success } from '@/shared/utils/core.utils';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY as string,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askQuestionToSlack(question: string) {
  const response = await openai.embeddings.create({
    input: question,
    model: 'text-embedding-3-small',
    encoding_format: 'float',
  });

  const embedding = response.data[0].embedding;

  const queryResponse = await pinecone.index('slack-messages').query({
    includeMetadata: true,
    topK: 3,
    vector: embedding,
  });

  const messages = await Promise.all(
    queryResponse.matches.map(async (match) => {
      const threadId = (match.metadata?.threadId || match.id) as string;

      const thread = await db
        .selectFrom('slackMessages')
        .select(['channelId', 'id', 'text'])
        .where('id', '=', threadId)
        .executeTakeFirstOrThrow();

      const allMessagesInThread = await db
        .selectFrom('slackMessages')
        .select(['channelId', 'id', 'text'])
        .where((eb) => {
          return eb.or([
            eb('id', '=', threadId),
            eb('threadId', '=', threadId),
          ]);
        })
        .orderBy('createdAt', 'asc')
        .execute();

      // concat all messages in thread into a single string
      const formattedReplies = allMessagesInThread
        .map((message) => message.text)
        .join('\n');

      console.log(match.score, allMessagesInThread.length, thread.text);

      return {
        question: thread.text!,
        replies: formattedReplies,
        threadId,
      };
    })
  );

  const userPrompt = dedent`
    Given the following threads that we found in our Slack workspace, answer
    the user's question. If you can't find the answer in the threads or are not
    confident, please respond that you couldn't find the answer.

    If you found something in a thread, be sure to include a reference by doing
    something like <threadId>.

    Question:
    ${question}

    Threads:
    ${JSON.stringify(messages, null, 2)}
  `;

  const completionResult = await getChatCompletion({
    maxTokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userPrompt,
          },
        ],
      },
    ],
    // system: systemPrompt,
    temperature: 0,
  });

  console.log(completionResult);

  if (!completionResult.ok) {
    return fail({
      code: 500,
      error: completionResult.error,
    });
  }

  return success(completionResult.data);
}
