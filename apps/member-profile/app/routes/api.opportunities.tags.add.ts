import { type ActionFunctionArgs, json } from '@remix-run/node';

import { createOpportunityTag } from '@oyster/core/opportunities';
import { CreateOpportunityTagInput } from '@oyster/core/opportunities/types';
import { validateForm } from '@oyster/ui';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function action({ request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);

  const { data, ok } = await validateForm(request, CreateOpportunityTagInput);

  if (!ok) {
    return json({}, { status: 400 });
  }

  await createOpportunityTag({
    color: data.color,
    id: data.id,
    name: data.name,
  });

  return json({});
}
