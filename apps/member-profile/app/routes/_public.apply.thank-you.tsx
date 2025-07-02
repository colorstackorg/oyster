import { data, type LoaderFunctionArgs, useLoaderData } from 'react-router';

import { Text } from '@oyster/ui';

import { commitSession, getSession } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  const email = session.get('email');

  return data(
    { email },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

export default function ThankYou() {
  const { email } = useLoaderData<typeof loader>();

  return email ? (
    <Text>
      Thank you for applying to ColorStack! You should receive a confirmation
      email at <span className="font-bold">{email}</span> shortly. We typically
      review applications within a few days, but it may take 1-2 weeks to hear
      back.
    </Text>
  ) : (
    <Text>
      Thank you for applying to ColorStack! We typically review applications
      within a few days, but it may take 1-2 weeks to hear back.
    </Text>
  );
}
