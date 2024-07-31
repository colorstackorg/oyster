import { z } from 'zod';

import { BooleanInput, Email } from '@oyster/types';

// Use Cases

export const AddAdminInput = z.object({
  email: Email,
  firstName: z.string().trim().min(1),
  isAmbassador: BooleanInput.default(false),
  lastName: z.string().trim().min(1),
});

export type AddAdminInput = z.infer<typeof AddAdminInput>;
