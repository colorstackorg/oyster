import { json, type LoaderFunctionArgs } from '@remix-run/node';
import dedent from 'dedent';
import { type Readable } from 'node:stream';

import { streamChatCompletion } from '@oyster/core/member-profile/server';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const { searchParams } = new URL(request.url);

  const question = searchParams.get('question');

  if (!question) {
    return json({ error: 'No question provided.' }, { status: 400 });
  }

  const messageStream = streamChatCompletion({
    maxTokens: 1000,
    messages: [{ content: question, role: 'user' }],
    system: [],
    temperature: 0,
  });

  messageStream.on('text', (textDelta, textSnapshot) => {
    console.log(textDelta, textSnapshot);
  });

  let accumulator = '';

  // Convert Node.js stream to Web stream using Remix's internal utility
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of messageStream) {
        if (chunk.type === 'content_block_delta' && chunk.delta) {
          accumulator += chunk.delta.text;

          controller.enqueue('event: data\n');
          controller.enqueue(`data: ${JSON.stringify(accumulator)}\n\n`);
        }
      }

      let closed = false;

      function close() {
        if (closed) {
          return;
        }

        closed = true;
        request.signal.removeEventListener('abort', close);
        controller.close();
      }

      request.signal.addEventListener('abort', close);

      if (request.signal.aborted) {
        close();
      }

      // async function push() {
      //   const decoder = new TextDecoder();

      //   const { done, value } = await reader.read();

      //   // When no more data needs to be consumed, close the stream
      //   if (done) {
      //     controller.close();

      //     return;
      //   }

      //   const chunk = decoder.decode(value);

      //   console.log(done, chunk);

      // if (chunk.type === 'content_block_delta') {
      //   accumulator += chunk.delta?.text || '';

      //   controller.enqueue(
      //     dedent`
      //         event: data\n
      //         data: ${JSON.stringify(accumulator)}\n\n
      //       `
      //   );
      // }

      //   return push();
      // }
    },
  });

  const response = new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });

  return response;
}
