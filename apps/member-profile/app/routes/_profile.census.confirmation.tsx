import { json, type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { CheckCircle } from 'react-feather';

import { Text } from '@oyster/ui';

import { Route } from '../shared/constants';
import { getTimezone } from '../shared/cookies.server';
import { getCensusResponse } from '../shared/core.server';
import { ensureUserAuthenticated, user } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await getCensusResponse({
    select: ['submittedAt'],
    where: {
      studentId: user(session),
      year: new Date().getFullYear(),
    },
  });

  if (!result) {
    return redirect(Route['/census']);
  }

  const timezone = getTimezone(request);

  const submittedAt = dayjs(result.submittedAt)
    .tz(timezone)
    .format('MMMM D, YYYY @ h:mm A');

  return json({
    submittedAt,
  });
}

export default function CensusConfirmation() {
  const { submittedAt } = useLoaderData<typeof loader>();

  return (
    <div className="rounded-xl border border-dashed border-green-700 bg-green-50 p-4">
      <div className="flex gap-2">
        <CheckCircle className="text-green-700" />
        <Text className="text-green-700">
          We received your submission at: {submittedAt}!
        </Text>
      </div>
    </div>
  );
}
