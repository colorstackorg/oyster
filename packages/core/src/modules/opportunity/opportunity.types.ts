import { z } from 'zod';

import { ISO8601Date } from '@oyster/types';

export const CreateOpportunityTagInput = z.object({
  color: z.string().trim().min(1),
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

export const EditOpportunityInput = z.object({
  closeDate: ISO8601Date,
  companyCrunchbaseId: z.string().trim().min(1),
  // companies: z
  //   .string()
  //   .trim()
  //   .min(1)
  //   .transform((value) => value.split(',')),
  description: z.string().trim().min(1).max(250),
  // expiresAt: z.string().trim().min(1),
  tags: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.split(',')),
  title: z.string().trim().min(1),
});

export type CreateOpportunityTagInput = z.infer<
  typeof CreateOpportunityTagInput
>;

export type EditOpportunityInput = z.infer<typeof EditOpportunityInput>;
