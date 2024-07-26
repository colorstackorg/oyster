import { z } from 'zod';

export const UpvoteCompanyReviewInput = z.object({
  memberId: z.string().min(1),
});

export type UpvoteCompanyReviewInput = z.infer<typeof UpvoteCompanyReviewInput>;
