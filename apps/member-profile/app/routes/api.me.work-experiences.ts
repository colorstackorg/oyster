import { type LoaderFunctionArgs } from 'react-router';

import { listWorkExperiences } from '@oyster/core/member-profile/server';
import { type SerializeFrom } from '@oyster/ui';

import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const _experiences = await listWorkExperiences(user(session), {
    include: ['hasReviewed'],
  });

  const experiences = _experiences.map(
    ({ companyName, id, hasReviewed, title }) => {
      return {
        company: companyName,
        id,
        hasReviewed,
        title,
      };
    }
  );

  return {
    experiences,
  };
}

export type GetWorkExperiencesResult = SerializeFrom<typeof loader>;
