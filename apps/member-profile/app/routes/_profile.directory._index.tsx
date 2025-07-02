import { json, type LoaderFunctionArgs, redirect } from '@remix-run/node';

import { Route } from '@/shared/constants';
import { getMember } from '@/shared/queries';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { joinedMemberDirectoryAt } = await getMember(user(session))
    .select(['joinedMemberDirectoryAt'])
    .executeTakeFirstOrThrow();

  if (!joinedMemberDirectoryAt) {
    return redirect(Route['/directory/join']);
  }

  return null;
}

export default function Component() {
  return null;
}
