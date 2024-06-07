import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';

import { listWorkExperiences } from '@/member-profile.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const _experiences = await listWorkExperiences(user(session));

  const experiences = _experiences.map(({ companyName, id, title }) => {
    return {
      company: companyName,
      id,
      title,
    };
  });

  return json({
    experiences,
  });
}

export type GetWorkExperiencesResult = SerializeFrom<typeof loader>;
