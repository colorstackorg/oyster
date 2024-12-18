import { type LoaderFunctionArgs } from '@remix-run/node';

import { reviewResume } from '@oyster/core/resume-reviews';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  // const stream = await reviewResume(params.id as string);

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue('Hello, world!');
      controller.error(new Error('test'));
      // controller.close();
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
