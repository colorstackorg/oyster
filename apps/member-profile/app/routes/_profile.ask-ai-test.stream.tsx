import { json, type LoaderFunctionArgs } from '@remix-run/node';
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

  let accumulator = '';

  // Convert Node.js stream to Web stream using Remix's internal utility
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of messageStream) {
        if (chunk.type === 'content_block_delta') {
          accumulator += chunk.delta?.text || '';

          controller.enqueue(
            'event: data\n' + `data: ${JSON.stringify(accumulator)}\n\n`
          );
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
    },
  });

  // const stream = nodeToWebReadable(
  //   messageStream.toReadableStream() as any
  // ).pipeThrough(transformer);

  const response = new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });

  return response;
}

function nodeToWebReadable(nodeReadable: Readable) {
  return new ReadableStream({
    start(controller) {
      nodeReadable.on('data', (chunk) => {
        controller.enqueue(chunk); // Forward Node.js chunks into Web stream
      });

      nodeReadable.on('end', () => {
        controller.close(); // Close the Web stream when the Node.js stream ends
      });

      nodeReadable.on('error', (err) => {
        controller.error(err); // Propagate errors
      });
    },

    cancel() {
      nodeReadable.destroy(); // Clean up when Web stream is canceled
    },
  });
}
