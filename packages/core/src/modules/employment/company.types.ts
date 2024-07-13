import { z } from 'zod';

export const DownvoteCompanyReviewInput = z.object({
  memberId: z.string().min(1),
});

export const UpvoteCompanyReviewInput = z.object({
  memberId: z.string().min(1),
});

export type DownvoteCompanyReviewInput = z.infer<
  typeof DownvoteCompanyReviewInput
>;
export type UpvoteCompanyReviewInput = z.infer<typeof UpvoteCompanyReviewInput>;
