import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';

import { listWorkExperiences } from '@oyster/core/member-profile/server';

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

  return json({
    experiences,
  });
}

export type GetWorkExperiencesResult = SerializeFrom<typeof loader>;
