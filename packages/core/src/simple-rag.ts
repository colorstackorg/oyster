import { Pinecone } from '@pinecone-database/pinecone';

import { db } from '@oyster/db';

import { getChatCompletion } from '@/infrastructure/ai';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY as string,
});

export async function answerQuestion(question: string): Promise<string> {
  // Step 1: Create an embedding of the question being asked.
  const embedding = await createEmbedding(question);

  // Step 2: Query the vector database for the most similar embeddings.
  const { matches } = await pinecone.index('slack-messages').query({
    includeMetadata: true,
    topK: 5,
    vector: embedding,
  });

  const threads = await Promise.all(
    matches.map(async (match) => {
      const channelId = match.metadata!.channelId as string;

      // Step 3: Get the actual records from our database that correlate w/
      // those embeddings. Note that when we store the embeddings in the vector
      // database, we have the ability to store metadata about the record,
      // which is how we're able to correlate the embeddings to the actual
      // records in our database.

      const [thread, replies] = await Promise.all([
        db
          .selectFrom('slackMessages')
          .select(['channelId', 'createdAt', 'text'])
          .where('channelId', '=', channelId)
          .where('id', '=', match.id)
          .executeTakeFirstOrThrow(),

        db
          .selectFrom('slackMessages')
          .select(['text'])
          .where('channelId', '=', channelId)
          .where('threadId', '=', match.id)
          .orderBy('createdAt', 'asc')
          .limit(50)
          .execute(),
      ]);

      // Step 4: Format the threads into a text format that will be easy for
      // the LLM to parse/understand.

      const formattedReplies = replies
        .map((message) => message.text || '')
        .join('\n');

      const parts = [
        '[Relevance Score]: ' + match.score,
        '[Timestamp]: ' + thread.createdAt,
        '[Channel ID]: ' + thread.channelId,
        '[Thread ID]: ' + match.id,
        '[Message]: ' + thread.text,
        '[Replies]: ' + formattedReplies,
      ];

      return parts.join('\n');
    })
  );

  const userPrompt = `
    Please answer the following question based on the Slack context provided:

    <question>${question}</question>
    <threads>${threads.join('\n\n')}</threads>
  `;

  // Step 5: Send the prompt to the LLM.

  const completionResult = await getChatCompletion({
    maxTokens: 1000,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: userPrompt }],
      },
    ],
    system: [{ cache: true, type: 'text', text: getSystemPrompt() }],
    temperature: 0,
  });

  if (!completionResult.ok) {
    throw new Error(completionResult.error);
  }

  // BOOM! We've got an answer. 🎉

  const answer = completionResult.data;

  return answer;
}

// Helpers

export async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const json = await response.json();

  const embedding = json.data[0].embedding;

  return embedding;
}

const SYSTEM_PROMPT = `
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

function getSystemPrompt() {
  return SYSTEM_PROMPT;
}
