import { type LoaderFunctionArgs } from 'react-router';
import { z } from 'zod';

import { searchSchools } from '@oyster/core/education';

const SchoolsSearchParams = z.object({
  search: z.string().trim().min(1).catch(''),
});

type SchoolsSearchParams = z.infer<typeof SchoolsSearchParams>;

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  const { search } = SchoolsSearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  try {
    const schools = await searchSchools(search);

    return {
      schools,
    };
  } catch (e) {
    return {
      schools: [],
    };
  }
}
