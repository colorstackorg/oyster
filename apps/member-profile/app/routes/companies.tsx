import { json, LoaderFunctionArgs, SerializeFrom } from '@remix-run/node';
import { z } from 'zod';

import {
  reportError,
  searchCrunchbaseOrganizations,
} from '../shared/core.server';
import { ensureUserAuthenticated } from '../shared/session.server';

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
    const companies = await searchCrunchbaseOrganizations(search);

    return json({
      companies,
    });
  } catch (e) {
    reportError(e);

    return json({
      companies: [],
    });
  }
}

export type SearchCompaniesResult = SerializeFrom<typeof loader>;
