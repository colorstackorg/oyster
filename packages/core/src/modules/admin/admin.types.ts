import { z } from 'zod';

import { Email, Entity } from '@oyster/types';

// Schemas

export const Admin = Entity.extend({
  email: Email,
  firstName: z.string().trim().min(1),
  isAmbassador: z.boolean().default(false),
  lastName: z.string().trim().min(1),
});

export const AddAdminInput = Admin.pick({
  email: true,
  firstName: true,
  lastName: true,
  isAmbassador: true,
});

// Types

export type Admin = z.infer<typeof Admin>;
export type AddAdminInput = z.infer<typeof AddAdminInput>;
