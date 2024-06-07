import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import { getCompany } from '@oyster/core/employment.server';
import { Text } from '@oyster/ui';

import { Card } from '@/shared/components/card';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const company = await getCompany({
    include: ['averageRating'],
    select: ['companies.description'],
    where: { id: params.id as string },
  });

  if (!company) {
    throw new Response(null, { status: 404 });
  }

  return json({
    company,
  });
}

export default function CompanyOverviewPage() {
  const { company } = useLoaderData<typeof loader>();

  return (
    <>
      <Text color="gray-500">{company.description}</Text>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Card>
          <Card.Title>Rating</Card.Title>
          <Text variant="4xl">
            {company.averageRating}
            <span className="text-base">/10</span>
          </Text>
        </Card>
        <Card>
          <Card.Title>Rating</Card.Title>
          <Text variant="4xl">
            {company.averageRating || 'N/A'}
            <span className="text-base">/10</span>
          </Text>
        </Card>
      </div>
    </>
  );
}
