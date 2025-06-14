import { json, type LoaderFunctionArgs } from '@remix-run/node';
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

    return json({
      schools,
    });
  } catch (e) {
    return json({
      schools: [],
    });
  }
}
