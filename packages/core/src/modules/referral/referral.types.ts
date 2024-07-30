import { z } from 'zod';

import { Email, type ExtractValue } from '@oyster/types';

// Enums

export const ReferralStatus = {
  ACCEPTED: 'accepted',
  APPLIED: 'applied',
  REJECTED: 'rejected',
  SENT: 'sent',
} as const;

export type ReferralStatus = ExtractValue<typeof ReferralStatus>;

// Use Cases

export const ReferFriendInput = z.object({
  email: Email,
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  referrerId: z.string().trim().min(1),
});

export type ReferFriendInput = z.infer<typeof ReferFriendInput>;
