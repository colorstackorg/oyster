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
  email: Email.refine((value) => {
    return (
      value.endsWith('.edu') ||
      value.endsWith('.ca') ||
      value.endsWith('mymdc.net') ||
      value.endsWith('@colorstack.org')
    );
  }, 'Must be a valid .edu email.'),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  referrerId: z.string().trim().min(1),
});

export type ReferFriendInput = z.infer<typeof ReferFriendInput>;
