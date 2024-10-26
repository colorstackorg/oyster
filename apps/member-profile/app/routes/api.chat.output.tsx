import { json, type LoaderFunctionArgs } from '@remix-run/node';

import { AnswerMemberProfileQuestion } from '@oyster/core/member-profile/server';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const url = new URL(request.url);
  const text = url.searchParams.get('text');

  if (!text) {
    return json({ error: 'No question provided' }, { status: 400 });
  }

  try {
    const result = await AnswerMemberProfileQuestion({ text });

    if (!result.ok) {
      console.error('Error in AnswerMemberProfileQuestion:', result.error);

      return json(
        { error: 'Failed to get answer from Anthropic' },
        { status: 500 }
      );
    }

    return json({ answer: result.data });
  } catch (error) {
    console.error('Unexpected error in AnswerMemberProfileQuestion:', error);

    return json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
