import { z } from 'zod';

export const RefineOpportunityInput = z.object({
  content: z.string().trim().min(1).max(10_000),
  opportunityId: z.string().trim().min(1),
});

export type RefineOpportunityInput = z.infer<typeof RefineOpportunityInput>;
