import { type LoaderFunctionArgs } from 'react-router';
import { z } from 'zod';

import {
  reportException,
  searchCompanies,
} from '@oyster/core/member-profile/server';
import { type SerializeFrom } from '@oyster/ui';

import { ensureUserAuthenticated } from '@/shared/session.server';

const CompaniesSearchParams = z.object({
  search: z.string().trim().min(1).catch(''),
});

type CompaniesSearchParams = z.infer<typeof CompaniesSearchParams>;

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const { search } = CompaniesSearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  try {
    const companies = await searchCompanies(search);

    return {
      companies,
    };
  } catch (e) {
    reportException(e);

    return {
      companies: [],
    };
  }
}

export type SearchCompaniesResult = SerializeFrom<typeof loader>;
